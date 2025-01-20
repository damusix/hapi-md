import Path from 'path';
import Hapi from '@hapi/hapi';
import CatboxMemory from '@hapi/catbox-memory';
import Exiting from 'exiting';
import Joi from 'joi';

import {
    inMinutes,
    development,
    production,
    dependencyInjectServer,
    registerMethods
} from './helpers';

import AppPlugins from './plugins';
import AppRoutes from './routes';
import AppMethods from './methods';

import {
    Policies,
    Plugins,
    Modules,
    Redirects,
    Metadata
} from './data';

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        url: string;
        githubToken: string;
        data: {
            policies: typeof Policies;
            plugins: typeof Plugins;
            modules: typeof Modules;
            redirects: typeof Redirects;
            metadata: typeof Metadata;
        };
    }

    interface Server {
        appSettings: () => ServerApplicationState;
    }

    interface Request {
        appSettings: () => ServerApplicationState;
    }
}

const deployment = async () => {

    /**
     * First, validate the environment
     */
    if (process.env.NODE_ENV === 'production') {

        Joi.assert(process.env, production);
    }
    else {

        Joi.assert(process.env, development);
    }

    /**
     * Create a new server instance
     */
    const server = Hapi.server({
        port: process.env.APP_PORT,
        host: 'localhost',
        routes: {
            files: {
                relativeTo: Path.join(__dirname, 'assets')
            }
        },
        app: {
            githubToken: process.env.GITHUB_TOKEN,
            url: process.env.APP_URL,
            data: {
                policies: Policies,
                plugins: Plugins,
                modules: Modules,
                redirects: Redirects,
                metadata: Metadata
            }
        }
    });

    server.decorate('server', 'appSettings', () => server.settings.app);
    server.decorate('request', 'appSettings', () => server.settings.app);

    /**
     * Use the Joi as the validator
     */
    server.validator(Joi);

    /**
     * Register a cache
     */
    server.cache.provision({
        name: 'memory',
        provider: {
            constructor: CatboxMemory.Engine,
            options: {
                partition: 'cache',
            }
        }
    });

    /**
     * Create a new Exiting manager.
     *
     * This will handle the server shutdown and
     * exit signal capture.
     */
    const manager = Exiting.createManager(server, { exitTimeout: inMinutes(0.5) });

    /**
     * Handle the redirects
     */
    server.ext('onRequest', (request, h) => {

        const { permanent, temporary } = request.appSettings().data.redirects;

        if (permanent[request.path]) {
            return h
                .redirect(permanent[request.path])
                .permanent()
                .takeover()
            ;
        }

        if (temporary[request.path]) {
            return h
                .redirect(temporary[request.path])
                .temporary()
                .takeover()
            ;
        }

        return h.continue;
    });

    /**
     * Build the server
     */
    await registerMethods(server, AppMethods);

    await server.register(
        await dependencyInjectServer(server, AppPlugins)
    );

    server.route(
        await dependencyInjectServer(server, AppRoutes)
    );

    /**
     * Lets get started
     */

    await server.initialize();
    await manager.start();

    return server;
}

if (require.main === module) {

    deployment();
}