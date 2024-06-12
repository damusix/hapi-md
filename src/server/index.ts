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
        port: 3000,
        host: 'localhost',
        routes: {
            files: {
                relativeTo: Path.join(__dirname, 'assets')
            }
        }
    });

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