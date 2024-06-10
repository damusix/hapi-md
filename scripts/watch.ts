import { resolve } from 'path';
import Fs, { WatchListener } from 'fs';
import { spawn } from 'child_process';

const fromRoot = (path: string) => resolve(__dirname, path);

let serverProc = spawn('pnpm', ['tsx','server'], { stdio: 'inherit', env: process.env  });
let clientProc = spawn('pnpm', ['client'], { stdio: 'inherit', env: process.env  });

const debounce = (fn: (...args: any[]) => void, delay: number) => {

    let timer: NodeJS.Timeout;

    return (...args: any[]) => {

        clearTimeout(timer);
        timer = setTimeout(fn.bind(fn, ...args), delay);
    }
}

const changed = new Set<string>();

const enactChanges = debounce((from: string) => {

    const changes = Array.from(changed).join(' ');

    console.log('Changes:', changes, 'from', from);

    if (
        from.includes('server') ||
        from.includes('docs')
    ) {

        serverProc.once('exit', () => {

            serverProc = spawn('pnpm', ['server']);
        });

        serverProc.kill('SIGTERM');
    }

    if (from.includes('client')) {

        clientProc.once('exit', () => {

            clientProc = spawn('pnpm', ['client']);
        });

        clientProc.kill('SIGTERM');
    }

    changed.clear();
}, 100);

const listener: (from: string) => WatchListener<string> = (from) => (

    (_, filename) => {

        console.log(from, filename);

        if (filename.includes('assets/build')) {
            return;
        }

        changed.add(filename);
        enactChanges(from);
    }
);


Fs.watch(fromRoot('../server'), { recursive: true },  listener('server'))
Fs.watch(fromRoot('../docs'), { recursive: true }, listener('docs'))
Fs.watch(fromRoot('../client'), { recursive: true }, listener('client'))


console.log('Watching...');