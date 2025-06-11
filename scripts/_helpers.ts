import { resolve } from 'path';
import Fs from 'fs';
import Net from 'net';
import {
    ChildProcess,
    SpawnSyncOptionsWithBufferEncoding,
    spawn,
    spawnSync
} from 'child_process';

import { attemptSync, Deferred } from '@logosdx/kit';
import C from 'chalk';

/**
 * Check if a port is occupied
 *
 * @param port - The port to check
 * @param host - The host to check
 * @returns True if the port is occupied, false otherwise
 */
export const portOccupied = (port: number, host: string = '127.0.0.1') => {

    const deferred = new Deferred<boolean>();

    const server = Net.createServer(() => {});

    server.on(
        'error',
        () => deferred.resolve(true)
    );

    server.listen(port, host);

    server.on(
        'listening',
        () => server.close(() => deferred.resolve(false))
    );

    return deferred.promise;
}

/**
 * Create a temporary directory to store the generated watch files
 */
export const mkTmpDir = () => (

    attemptSync(
        () => Fs.mkdirSync(resolve(import.meta.dirname, '../tmp'))
    )
)

/**
 * Resolve a path relative to the scripts directory
 */
export const fromScripts = (path: string) => resolve(import.meta.dirname, path);


/**
 * Run a pnpm command in the project directory
 */
export const projectProc = (args: string) => (

    spawn(
        'pnpm',
        args.split(' '),
        {
            stdio: 'inherit',
            env: process.env
        }
    )
);

/**
 * Track the server and client processes
 *
 * This list can eventually grow
 */
export const procs: Record<
    (
        'server' |
        'client'
    ),
    ChildProcess | null
> = {
    server: null,
    client: null,
};

/**
 * Spawn a process and reload it when it closes
 *
 * Handles the case where the process is already running,
 * and when needing to restart the process. Allows for
 * custom callbacks after the spawn and close events.
 */
export const spawnAndReload = (
    procKey: keyof typeof procs,
    command: string,
    opts: {
        beforeSpawn?: () => Promise<void> | void;
        afterSpawn?: () => void;
        afterClose?: () => void;
    } = {}
) => {

    const {
        beforeSpawn = () => {},
        afterSpawn = () => {},
        afterClose = () => {},
    } = opts;

    const proc = procs[procKey];

    const respawn = async () => {

        await beforeSpawn();

        procs[procKey] = projectProc(command);

        procs[procKey].once('spawn', () => {

            setTimeout(afterSpawn, 250);
        });

        procs[procKey].once('close', () => {

            setTimeout(afterClose, 250);
        });
    }

    // If the process is not running, spawn it
    if (proc === null) {

        respawn();
        return;
    }

    // If the process is running, kill it
    if (proc.exitCode === null) {


        proc.once('close', respawn);

        proc.kill('SIGTERM');
        return;
    }

    // If the process is not running, spawn it
    respawn();
}

/**
 * Run a shell command
 *
 * Used for simple shell commands that don't need to be tracked
 */
export const sh = (args: string, opts?: SpawnSyncOptionsWithBufferEncoding) => {

    opts = opts || { stdio: 'inherit' };

    const { status } = spawnSync(
        'sh',
        ['-c', args],
        opts
    );

    return status;
}

/**
 * Kill a process on a port
 *
 * @param port - The port to kill
 */
export const killPort = (port: number) => {

    sh(`kill -9 $(lsof -t -i:${port})`);
}

/**
 * Input strings to match against user input
 */
export const inputStrings = {

    restart: ['rs', 'reload', 'restart'],
    server: ['server', 'srv', 's'],
    client: ['client', 'cl', 'c'],
    quit: ['q', 'quit', 'exit'],
}

/**
 * Get the current date and time
 */
export const date = () => {

    const now = new Date();

    const day = `${now.getMonth() + 1}/${now.getDate()}`;
    const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

    return `${day} ${time}`;
};

/**
 * Log a message to the console
 */
export const log = (...msgs: any[]) => {

    console.log(
        C.gray('-->', date()),
        ...msgs
    );
}

/**
 * Show the help text
 */
export const helpText = () => {

    return [
        'Usage:',
        '  pnpm dev',
        '  pnpm kill <port>',
        '',
        'Commands:',
        '  dev - Start the development server',
        '',
        'This script does the following:',
        '  - Starts vite in watch mode',
        '  - Nodemon watches the server and restarts it when it changes',
        '  - Creates a watch server that will refresh the browser whenever vite is recompiled, an static file is changed, or the server is restarted',
        '',
        'Input strings:',
        '  rs, reload, restart - Restart all processes',
        '  server, srv, s - Restart the server only',
        '  client, cl, c - Restart the client only',
        '  q, quit, exit - Quit the watcher',
        '  kill <port> - Kill a process on a port',
        '  var <key>=<value> ... - Set one or more environment variables. Will save to .env file if not already present.',
        '  debug - Toggle debug mode',
    ].join('\n');
}

/**
 * Save the environment variables to .env file
 */
export const saveEnv = (envs: Record<string, string>) => {

    // Load the .env file
    const env = Fs.readFileSync(
        resolve(import.meta.dirname, '../.env'),
        'utf8'
    );

    // Get existing env variables
    const existing = env.split('\n')

        // Filter out empty lines
        .filter(line => line.trim() !== '')

        // Filter out comments
        .filter(line => !line.startsWith('#'))

        // Format the existing variables
        .map(line => {

            const [key, ...value] = line.split('=');

            return {
                key,
                value: value.join('='),
            };
        });

    // Get new env variables
    const newEnv = Object.entries(envs)

        // Filter out existing variables
        .filter(([key]) => !existing.some(e => e.key === key))

        // Format the new variables
        .map(([key, value]) => `${key}=${value}`)

        // Join the new variables
        .join('\n');

    // Append to the end of the file
    const contents = `${env}\n${newEnv}`;

    // Write the new env variables to the .env file
    Fs.writeFileSync(
        resolve(import.meta.dirname, '../.env'),
        contents
    );
}
