import Fs from 'fs';
import Path from 'path';

import { Plugin, ResponseObject } from "@hapi/hapi";

declare module '@hapi/hapi' {

    interface ServerMethods {
        watchHtml?: () => string;
    }
}

export const watchPlugin: Plugin<{}> = {
    name: 'dev/watch',
    async register(server) {

        if (process.env.NODE_ENV !== 'development') {
            return;
        }

        // Load the generated watch browser html
        const watchHtml = Fs.readFileSync(
            Path.join(__dirname, '../../../../tmp/watch-browser.html'),
            'utf8'
        );

        // Load the generated watch server script
        const { serverWatchConnect } = await import('../../../../tmp/watch-server');

        // Expose the watch html to the server
        server.method('watchHtml', () => watchHtml);

        // Connect the server to the watch server
        server.events.once('start', () => serverWatchConnect());
    }
}

export default {
    plugin: watchPlugin,
    options: {}
};