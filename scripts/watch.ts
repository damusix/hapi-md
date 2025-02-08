import Fs, { WatchListener } from 'fs';

import Hapi, { Server } from '@hapi/hapi';
import Nes from '@hapi/nes';
import Ejs from 'ejs';
import C from 'chalk';

import {
    debounce,
    fromScripts,
    spawnAndReload,
    mkTmpDir,
    inputStrings,
    log,
    sh,
    helpText,
    saveEnv,
} from './_helpers';

// We need to create a temporary directory to store the watch.html file
mkTmpDir();
process.loadEnvFile();

let watchServer: Server;

// Track changed files
const changed = new Set<string>();

// Send a message to the client to reload the page
const reload = () => {

    watchServer.publish('/', { reload: true });
}

// Debounce the changes to prevent multiple reloads
const enactChanges = debounce((from: string) => {

    const changes = Array.from(changed).join(' ');

    log(
        C.yellow('Changes:'),
        changes,
        C.yellow('from'),
        C.magenta(from)
    );

    // If the changes are from the server, docs, or views, restart the server
    if (
        from.includes('server') ||
        from.includes('docs') ||
        from.includes('views')
    ) {

        spawnAndReload('server', 'run server');
    }

    // If the changes are from the client, restart the client
    if (from.includes('client')) {

        spawnAndReload('client', 'client', { afterClose: reload });
    }

    // Clear the changes
    changed.clear();
}, 100);


// Create a listener for file changes
const listener: (from: string) => WatchListener<string> = (from) => (

    (_, filename) => {

        // Ignore changes to the build directory
        if (filename.includes('assets/build')) {
            return;
        }

        changed.add(filename);
        enactChanges(from);
    }
);


const watch = async () => {

    // Create a Hapi server
    const server = Hapi.server();

    watchServer = server;

    // Register the nes plugin for websocket reloading
    await server.register({
        plugin: Nes,
        options: {
            onMessage(socket, message) {

                const msg = message as { server?: boolean; browser?: boolean };

                if (msg.server) {

                    log(C.yellow('Backend connected to watch server...'));
                    reload();
                }

                if (msg.browser) {

                    log(C.yellow('Browser connected to watch server...'));
                }
            }
        }
    });

    // Create a subscription for communicating reloads
    server.subscription('/');

    await server.start();

    // Spawn the server and client processes
    spawnAndReload('server', 'run server',);
    spawnAndReload('client', 'client', { afterClose: reload });

    // Attach a watcher to directories
    Fs.watch(fromScripts('../src/server'), { recursive: true },  listener('server'))
    Fs.watch(fromScripts('../src/docs'), { recursive: true }, listener('docs'))
    Fs.watch(fromScripts('../src/views'), { recursive: true }, listener('views'))

    Fs.watch(fromScripts('../src/client'), { recursive: true }, listener('client'))

    // Create a watch-browser.html file to serve the client
    const watchHtmlScript = Ejs.render(
        Fs.readFileSync(fromScripts('tmpl/watch-browser.ejs')).toString('utf-8'),
        server.info
    );

    // Create a watch-server.ts file to connect the server to the client
    const watchServerScript = Ejs.render(
        Fs.readFileSync(fromScripts('tmpl/watch-server.ts.ejs')).toString('utf-8'),
        server.info
    );

    Fs.writeFileSync(fromScripts('../tmp/watch-browser.html'), watchHtmlScript);
    Fs.writeFileSync(fromScripts('../tmp/watch-server.ts'), watchServerScript);

    log(helpText());
}

watch();

let debugMode = false;

//

process.stdin.on('data', (data) => {

    const cmd = data.toString().trim();

    if (inputStrings.restart.includes(cmd)) {

        log(C.yellow('Restarting server and client...'));

        spawnAndReload('server', 'run server');
        spawnAndReload('client', 'client', { afterClose: reload });
        return;
    }

    if (inputStrings.server.includes(cmd)) {

        log(C.yellow('Restarting server...'));

        spawnAndReload('server', 'run server');
        return;
    }

    if (inputStrings.client.includes(cmd)) {

        log(C.yellow('Restarting client...'));

        spawnAndReload('client', 'client', { afterClose: reload });
        return;
    }

    if (inputStrings.quit.includes(cmd)) {

        log(C.red('Goodbye!!!'));

        process.exit(0);
    }

    // Deal with the occasional need to kill port processes
    if (cmd.includes('kill')) {

        const [_, ...ports] = cmd.split(' ');

        ports.forEach((port) => {

            log(C.yellow('Killing process on port'), port);
            sh(`kill -9 $(lsof -t -i:${port})`);
        });
    }

    // Set environment variables
    if (cmd.includes('var')) {

        const [_, ...rest] = cmd.split(' ');

        const newEnvs = {} as Record<string, string>;

        for (const item of rest) {

            const [key, ...value] = item.split('=');

            if (key === 'NODE_ENV') {

                log(C.yellow('Cannot set NODE_ENV'));
                continue;
            }

            process.env[key] = value.join('=');
            newEnvs[key] = value.join('=');

            log(C.yellow('Setting environment variable'), key, value);

        }

        saveEnv(newEnvs);

        spawnAndReload('server', 'run server');
        spawnAndReload('client', 'client', { afterClose: reload });
    }

    // Toggle debug mode
    if (cmd === 'debug') {

        debugMode = !debugMode;
        process.env.DEBUG = debugMode ? '' : '*';

        log(C.yellow('Debug mode'), debugMode ? C.green('enabled') : C.red('disabled'));
        spawnAndReload('server', 'run server');
    }

    if (cmd === 'help') {

        log(helpText());
    }
});