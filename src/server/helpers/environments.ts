import Joi from 'joi';


export const baseEnv = Joi.object({
    NODE_ENV: Joi.string().allow('development', 'production', 'test').default('development'),
}).unknown(true);

export const development = baseEnv.keys({

});

export const production = baseEnv.keys({

});
