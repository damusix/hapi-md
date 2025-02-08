declare namespace NodeJS {

    interface ProcessEnv {
        NODE_ENV: 'development' | 'production' | 'test';
        APP_URL: string;
        APP_PORT: string;
        GITHUB_TOKEN: string;
    }
}