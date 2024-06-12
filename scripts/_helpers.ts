import { resolve } from 'path';
import Fs from 'fs';
import { ChildProcess, SpawnSyncOptionsWithBufferEncoding, spawn, spawnSync } from 'child_process';

import C from 'chalk';

/**
 * Create a temporary directory to store the generated watch files
 */
export const mkTmpDir = () => {

    try {
        Fs.mkdirSync(resolve(__dirname, '../tmp'));
    }
    catch (e) {}
}

/**
 * Resolve a path relative to the scripts directory
 */
export const fromScripts = (path: string) => resolve(__dirname, path);

/**
 * Simple debounce function, no need for lodash
 */
export const debounce = (fn: (...args: any[]) => void, delay: number) => {

    let timer: NodeJS.Timeout;

    return (...args: any[]) => {

        clearTimeout(timer);
        timer = setTimeout(fn.bind(fn, ...args), delay);
    }
}

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

        afterSpawn?: () => void;
        afterClose?: () => void;
    } = {}
) => {

    const {
        afterSpawn = () => {},
        afterClose = () => {},
    } = opts;

    const proc = procs[procKey];

    const respawn = () => {

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

    const help = [
        [inputStrings.restart, 'Restart the server and client'],
        [inputStrings.server, 'Restart the server'],
        [inputStrings.client, 'Restart the client'],
        [inputStrings.quit, 'Quit the watcher'],
        [['kill', '<...port>'], 'Kill a process on a port'],
        [['debug'], 'Toggle debug mode'],
        [['help'], 'Show this help text'],
    ];

    const maxLen = help.reduce(
        (acc, [cmd]) => Math.max(
            acc,
            [cmd]
                .flat()
                .join(', ')
                .length
        ),
        0
    );

    const txt = help.map(([cmd, desc]) => {

        const cmdStr = [cmd]
            .flat(3)
            .join(', ')
            .padEnd(maxLen + 2)
        ;

        return `${C.yellow(cmdStr)}${desc}`;
    }).join('\n');

    return `\n${txt}\n`;
}