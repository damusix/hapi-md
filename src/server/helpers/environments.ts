import Joi from 'joi';

export const baseEnv = Joi.object({

    NODE_ENV: Joi.string().allow(
        'development',
        'production',
        'test'
    ).default('development'),

    APP_URL: Joi.string().uri().default('http://localhost'),
    APP_PORT: Joi.number().default(3000),

    GITHUB_TOKEN: Joi.string().required(),

}).unknown(true);

export const development = baseEnv.keys({

});

export const production = baseEnv.keys({
    APP_URL: Joi.string().uri().required(),
    APP_PORT: Joi.number().required(),
});
