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
    registerMethods,
    validateEnv
} from './helpers/index.ts';

import AppPlugins from './plugins/index.ts';
import AppRoutes from './routes/index.ts';
import AppMethods from './methods/index.ts';

import {
    Policies,
    Plugins,
    Modules,
    Redirects,
    Metadata
} from './data/index.ts';

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
    const env = validateEnv(process.env.NODE_ENV);

    if (!env) {

        process.exit(1);
    }

    /**
     * Create a new server instance
     */
    const server = Hapi.server({
        port: env.APP_PORT,
        host: '0.0.0.0',
        routes: {
            files: {
                relativeTo: Path.join(import.meta.dirname, 'assets')
            }
        },
        app: {
            githubToken: env.GITHUB_TOKEN,
            url: env.APP_URL,
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
        type PermPath = keyof typeof permanent;
        type TempPath = keyof typeof temporary;

        const path = request.path as PermPath | TempPath;

        if (path in permanent) {
            return h
                .redirect(permanent[path as PermPath])
                .permanent()
                .takeover()
            ;
        }

        if (path in temporary) {
            return h
                .redirect(temporary[path as TempPath])
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

if (import.meta.url === new URL(import.meta.url).href) {

    deployment();
}