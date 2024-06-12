import { Server, ServerMethodOptions } from '@hapi/hapi';
import Joi from 'joi';

export type ServerDependentFn<T = unknown> = (server: Server) => T;

/**
 * Extract configuration objects for the server by first
 * executing the units that require the server object
 * in order to load their configuration
 */
export const dependencyInjectServer = <T extends unknown[]>(server: Server, things: T) => {

    return Promise.all(

        things.map((thing) => {

            if (typeof thing === 'function') {

                return thing(server);
            }

            return thing;
        })
    )
};


const methodSchema = Joi.object({
    name: Joi.string().required(),
    method: Joi.func().required(),
    options: Joi.object(),
});

export type MethodConfig = {
    name: string;
    method: <P extends unknown[] = unknown[], R = unknown>(...args: P) => R;
    options?: ServerMethodOptions;
}

export const registerMethods = async (server: Server, _methods: MethodConfig[]) => {

    Joi.assert(
        _methods,
        Joi.array().items(methodSchema),
    );

    const methods = await dependencyInjectServer(server, _methods);

    methods.forEach(({ name, method, options }) => {

        server.method(name, method, options);
    });
}