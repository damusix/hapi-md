import Joi from 'joi';

export const baseEnv = {

    NODE_ENV: Joi.string().allow(
        'development',
        'production',
        'test'
    ).default('development'),

    APP_URL: Joi.string()
        .uri()
        .error(new Error('APP_URL is required'))
        .required()
    ,

    APP_PORT: Joi.number()
        .error(new Error('APP_PORT is required'))
        .required()
    ,

    GITHUB_TOKEN: Joi.string()
        .error(new Error('GITHUB_TOKEN is required'))
        .required()
    ,

}

export const development = Joi.object({
    ...baseEnv,
}).unknown(true);

export const production = Joi.object({
    ...baseEnv,
}).unknown(true);

export const validateEnv = (env: 'development' | 'production' | 'test' = 'development') => {

    const schema = env === 'production' ? production : development;

    const keys = Object.keys(baseEnv);

    const extracted = keys.reduce((acc, key) => {

        acc[key] = process.env[key];
        return acc;
    }, {});

    const { error } = schema.validate(extracted);

    if (error) {

        console.error(error);
        return null;
    }


    return process.env;
}