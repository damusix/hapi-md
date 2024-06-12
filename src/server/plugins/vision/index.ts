import Path from 'path'
import Ejs from 'ejs';

import {
    Plugin,
    Request,
    ResponseObject,
    ResponseToolkit,
    Server,
    ServerRegisterPluginObject
} from '@hapi/hapi';

import Vision from '@hapi/vision'
import Hoek from '@hapi/hoek';

import ViewHelpers from '../../../views/helpers';
import { ServerDependentFn } from '../../helpers';

const fromViews = (...paths: string[]) => Path.join(__dirname, '../../../views', ...paths);

const visionConfig: ServerDependentFn<
    ServerRegisterPluginObject<any>
> = () => {

    const ejsOptions: Ejs.Options = {

        views: [
            fromViews(),
        ],
        debug: !!process.env.DEBUG
    }

    return {
        plugin: Vision,
        options: {

            engines: {
                html: Ejs,
                ejs: Ejs
            },
            relativeTo: fromViews(),
            path: `./pages`,
            layoutPath: `./layouts`,
            partialsPath: `./partials`,
            layout: './main',
            defaultExtension: 'ejs',
            runtimeOptions: ejsOptions,
            compileOptions: ejsOptions,
            context: {

                ...ViewHelpers
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