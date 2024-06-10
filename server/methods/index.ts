
import { Server } from '@hapi/hapi';

import Joi from 'joi';

const methods = [

];

const methodSchema = Joi.object({
    name: Joi.string().required(),
    method: Joi.func().required(),
    options: Joi.object(),
});

export const registerMethods = async (server: Server) => {

    Joi.assert(
        methods,
        Joi.array().items(methodSchema),
    );

    methods.forEach(({ name, method, options }) => {

        server.method(name, method, options);
    });
}

export default registerMethods;