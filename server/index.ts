import Hapi from '@hapi/hapi';
import CatboxMemory from '@hapi/catbox-memory';
import Exiting from 'exiting';
import Joi from 'joi';

import { inMinutes } from './helpers';

import Plugins from './plugins';
import AppRoutes from './routes';
import { registerMethods } from './methods';

const deployment = async () => {

    const server = Hapi.server({
        port: 3000,
        host: 'localhost',
    });

    server.validator(Joi);
    server.cache.provision({
        name: 'memory',
        provider: {
            constructor: CatboxMemory.Engine,
            options: {
                partition: 'cache',
            }
        }
    });

    const manager = Exiting.createManager(server, { exitTimeout: inMinutes(0.5) });

    registerMethods(server);

    await server.register(Plugins);


    server.route(AppRoutes);

    await server.initialize();
    await manager.start();

    return server;
}

if (require.main === module) {



    deployment();
}