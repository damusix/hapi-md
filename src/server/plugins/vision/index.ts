import Path from 'path'
import { Eta, Options as EtaOptions } from 'eta';

import {
    Plugin,
    Request,
    ResponseObject,
    ResponseToolkit,
    ServerRegisterPluginObject
} from '@hapi/hapi';

import Vision from '@hapi/vision'
import * as Hoek from '@hapi/hoek';

import ViewHelpers from '../../../views/helpers/index.ts';
import { ServerDependentFn } from '../../helpers/index.ts';

const fromViews = (...paths: string[]) => Path.join(import.meta.dirname, '../../../views', ...paths);

const visionConfig: ServerDependentFn<
    ServerRegisterPluginObject<any>
> = (server) => {

    const etaOptions: EtaOptions = {

        filepath: fromViews(),
        async: true,
    }

    const {
        data: {
            metadata,
            modules,
            plugins,
            policies,
        },

    } = server.appSettings();

    const helpers = ViewHelpers(server);

    const eta = new Eta({

        views: fromViews(),
        cache: process.env.NODE_ENV === 'production',
        debug: process.env.NODE_ENV === 'development',
        functionHeader: "Object.entries({...it}||{}).forEach(([k,v])=>globalThis[k]=v);"
    });

    const engine = {
        compile: (src: string, options: EtaOptions) => {

            const compiled = eta.compile(src, options);

            return (context: any) => {

                const answer = eta.render(compiled, context);

                return answer;
            };
        },
        registerPartial: (name: string, src: string) => {

            eta.loadTemplate(`@${name}`, src);
        },

    }

    return {
        plugin: Vision,
        options: {
            engines: {
                html: engine,
                eta: engine,
            },
            relativeTo: fromViews(),
            path: `./pages`,
            partialsPath: `./partials`,
            defaultExtension: 'eta',
            runtimeOptions: etaOptions,
            compileOptions: etaOptions,
            context: {
                meta: metadata,
                modules,
                plugins,
                policies,
                ...helpers
            }
        }
    };
}

const pluginConfig: ServerDependentFn<
    ServerRegisterPluginObject<any>
> = (server) => {

    /**
     * Extract the context for the ejs template from the request
     */
    const extractEjsContext = function <R extends Request>(
        request: R,
        context: object,
    ) {

        let payload = Hoek.reach(request, 'payload', { default: {} });

        if (typeof payload !== 'object') {
            payload = {};
        }

        const ctx = {
            ...context,
            ...request.app,
            reqData: {

                ...Hoek.reach(request, 'query', { default: {} }),
                ...Hoek.reach(request, 'params', { default: {} }),
                ...payload
            },

            // Add the watch html to the context for reloading
            // in development. This will be empty in production.
            watchHtml: server.methods.watchHtml?.() || '',
        }

        return ctx;
    }

    const viewOverride = function (view: Vision.ToolkitRenderMethod) {

        return function (
            this: ResponseToolkit,
            page: string,
            context = {},
            options: Vision.ServerViewsConfiguration
        ) {

            const extracted = extractEjsContext(this.request, context);
            const res = view.call(
                this,
                page,
                {
                    ...extracted,

                    // Make the page available to EJS
                    page,

                    // Make the layout available to EJS
                    layout: options?.layout || 'none',
                },
                (options || {})
            ) as ResponseObject;

            // Guarantee an html content type
            return res.header(
                'Content-Type',
                'text/html; charset=utf-8'
            );
        };
    }

    const plugin: Plugin<{}> = {
        name: 'vision/override',
        async register(server) {

            server.decorate(
                'toolkit',
                'view',
                viewOverride,
                {
                    extend: true,
                }
            );
        },
    }

    return { plugin };
};

export default [
    visionConfig,
    pluginConfig,
];