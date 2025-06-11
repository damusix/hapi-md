import { Plugin, ResponseObject, Request } from '@hapi/hapi';
import Boom from '@hapi/boom';
import * as Hoek from '@hapi/hoek'

export type LogEvent = {
    time: number;
    type: 'request' | 'server' | 'error' | 'log' | 'route';
    isError?: boolean;
    auth?: unknown;
    channel?: string;
    completed?: number;
    data?: unknown;
    headers?: unknown;
    host?: string;
    hostname?: string;
    ip?: string;
    message?: string;
    method?: string;
    params?: unknown;
    path?: string;
    payload?: unknown;
    pre?: unknown;
    query?: unknown;
    received?: number;
    referrer?: string;
    remotePort?: number;
    responded?: number;
    routeId?: string;
    routePath?: string;
    state?: unknown;
    statusCode?: number;
    tags?: string;
    stack?: string;
}

type ReqLogEvent = LogEvent;

type GenFilterFn = <T>(objectLike: T) => Partial<T>;

export type LoggerOpts = {

    /**
     * Generic filter function
     */
    filter?: GenFilterFn;

    queryFilter?: GenFilterFn;
    payloadFilter?: GenFilterFn;
    headersFilter?: GenFilterFn;
    paramsFilter?: GenFilterFn;
    stateFilter?: GenFilterFn;

    omit?: (keyof LogEvent)[];
    pick?: (keyof LogEvent)[];

    handler?: (log: ReqLogEvent | LogEvent) => void;
    stripStack?: boolean;
}

declare module '@hapi/hapi' {

    interface PluginSpecificConfiguration {
        logger?: LoggerOpts;
    }
}

const extractRequestData = (request: Request, _filters: LoggerOpts) => {

    const _routeFilters = Hoek.reach(request.route.settings, 'plugins.logger', { default: {} }) as LoggerOpts;
    const filters = Hoek.applyToDefaults(_filters, _routeFilters);

    const omit = filters.omit || [];
    const pick = filters.pick || [];

    const shouldStripStack = filters.stripStack || false;

    const {
        info: {
            received,
            completed,
            hostname,
            id,
            remoteAddress,
            responded,
            referrer,
            remotePort,
            host
        },
        response: _response,
        route,
        query,
        params,
        payload,
        headers,
        state,
        auth,
        pre,
        path,
        method,
    } = request;

    const response = _response as ResponseObject;
    const err = (_response as any)._error as Boom.Boom;

    let statusCode = response.statusCode;
    let type = 'request';
    let data: unknown | undefined = undefined;
    let stack: string | undefined = undefined;
    let isError = false;
    if (
        err?.isBoom ||
        (response.statusCode && response.statusCode >= 400)

    ) {
        statusCode = response.statusCode || err.output.statusCode;
        stack = err.stack;
        data = err.data;
        isError = true;
    }

    const ip = headers['x-forwarded-for'] || remoteAddress;

    if (shouldStripStack && stack) {
        stack = stripStack(stack).trim();
    }

    const _log = {
        time: Date.now(),
        type,
        method,
        path,
        routeId: id,
        routePath: route.path,
        statusCode,
        hostname,
        ip,
        remotePort,
        host,
        received,
        completed,
        responded,
        referrer,
        query: filters.queryFilter?.(query),
        params: filters.paramsFilter?.(params),
        payload: filters.payloadFilter?.(payload),
        headers: filters.headersFilter?.(headers),
        state: filters.stateFilter?.(state),
        auth,
        pre,
        data,
        stack,
        isError,
    }

    for (const key of omit) {

        delete _log[key as keyof typeof _log];
    }

    if (pick && pick.length !== 0) {

        const picked = {} as Record<string, any>;

        for (const key of pick) {
            picked[key] = _log[key as keyof typeof _log];
        }

        picked.type = type;
        picked.isError = isError;
        return picked;
    }

    return _log;
}

const undefinedOrFunc = (
    opt: ((...a: any) => any) | undefined,
    msg: string
) => (

    Hoek.assert(opt === undefined || typeof opt === 'function', msg)
);


export const jsonPrint = (obj: LogEvent) => process.stdout.write(Hoek.stringify(obj) + '\n')

const rgb = (r: number, g: number, b: number) => `\x1b[38;2;${r};${g};${b}m`;

const c = {
    red: rgb(175, 0, 0),
    green: rgb(0, 175, 0),
    yellow: rgb(225, 225, 0),
    blue: rgb(0, 0, 175),
    blue2: rgb(0, 160, 225),
    magenta: rgb(175, 0, 175),
    cyan: rgb(0, 220, 220),
    white: rgb(240, 240, 240),
    gray: rgb(128, 128, 128),
    black: rgb(0, 0, 0),
    reset: '\x1b[0m',
}

type Loggable = { toString: () => string }

const loggable = (...txt: Loggable[]) => txt.filter(Boolean).join(' ');
const colored = (color: string) => (...txt: Loggable[]) => {

    const msg = loggable(txt);

    if (!msg) return '';

    return `${color}${msg}${c.reset}`
};

const red = colored(c.red);
const green = colored(c.green);
const yellow = colored(c.yellow);
const blue = colored(c.blue);
const blue2 = colored(c.blue2);
const magenta = colored(c.magenta);
const cyan = colored(c.cyan);
const white = colored(c.white);
const gray = colored(c.gray);
const black = colored(c.black);

const types = {
    server: colored(c.cyan),
    route: colored(c.blue2),
    log: colored(c.green),
    error: colored(c.red),
    request: colored(c.gray),
}

const icons = {
    server: '🔌',
    route: '⚡',
    log: '✨',
    error: '🚨',
    request: '🚀'
}

const stripStack = (stack: string) => stack
    .split('\n')
    .filter(line => !line.includes('node_modules'))
    .join('\n')
;


export const prettyPrint = (log: LogEvent) => {

    const time = gray(
        new Date(log.time || Date.now())
            .toISOString()
            .split('T').join(' ')
            .split('.')[0]
    );
    let ip = gray(log.ip!);

    const logIcon = icons[log.type] || icons.log;
    const logFn = types[log.type] || types.log;
    let type = logFn(log.type);
    let statusCode = green(log.statusCode!);
    let method = yellow(log.method!);
    let path = white(log.path!);

    let message = log.message ? white(log.message) : undefined;
    let stack: string | undefined = undefined;

    if (log.isError) {
        type = red(log.type);
        statusCode = red(log.statusCode!);
        stack = '\n' + red(log.stack!) + '\n';
    }

    let query = undefined as unknown as string;
    let payload = undefined as unknown as string;
    let params = undefined as unknown as string;
    let headers = undefined as unknown as string;
    let state = undefined as unknown as string;

    if (log.type === 'request') {

        query = Hoek.stringify(log.query, null, 2)
        state = log.state as string && '\nState: ' + Hoek.stringify(log.state, null, 2) + '\n'
        payload = log.payload as string && '\nPayload: ' + Hoek.stringify(log.payload, null, 2) + '\n'
        params = log.params as string && '\nParams: ' + Hoek.stringify(log.params, null, 2) + '\n'
        headers = log.headers as string && '\nHeaders: ' + Hoek.stringify(log.headers, null, 2) + '\n'
    }

    process.stdout.write(
        loggable(
            logIcon,
            time,
            ip,
            type,
            statusCode,
            method,
            path,
            query,
            payload,
            params,
            headers,
            state,
            message || '',
            stack || ''
        ) + '\n'
    )
}

export const plugin: Plugin<LoggerOpts> = {

    name: 'logger',
    register: async (server, opts) => {

        undefinedOrFunc(opts.handler, 'handler must be a function')
        undefinedOrFunc(opts.filter, 'filter must be a function')
        undefinedOrFunc(opts.queryFilter, 'queryFilter must be a function')
        undefinedOrFunc(opts.payloadFilter, 'payloadFilter must be a function')
        undefinedOrFunc(opts.headersFilter, 'headersFilter must be a function')
        undefinedOrFunc(opts.paramsFilter, 'paramsFilter must be a function')
        undefinedOrFunc(opts.stateFilter, 'stateFilter must be a function')

        Hoek.assert(opts.omit === undefined || Array.isArray(opts.omit), 'omit must be an array')
        Hoek.assert(opts.pick === undefined || Array.isArray(opts.pick), 'pick must be an array')
        Hoek.assert(!(!!opts.omit && !!opts.pick), 'omit and pick cannot be used together')

        const _filter = opts.filter || ((obj) => obj);
        const handler = opts.handler || console.info;

        const {
            queryFilter = _filter,
            payloadFilter = _filter,
            paramsFilter = _filter,
            headersFilter = _filter,
            stateFilter = _filter,
        } = opts;

        server.events.on('response', (request) => {

            const _log = extractRequestData(request, {
                queryFilter,
                payloadFilter,
                paramsFilter,
                headersFilter,
                stateFilter,
                omit: opts.omit,
                pick: opts.pick,
                stripStack: opts.stripStack,
            });

            handler(_log);
        });

        server.events.on('start', () => {

            handler({
                type: 'server',
                message: `Server started on ${server.info.uri}`,
                time: Date.now(),
            });
        });

        server.events.on('stop', () => {

            handler({
                type: 'server',
                message: 'Server stopped',
                time: Date.now()

            });
        });

        server.events.on('log', (event) => {

            const {
                error: _error,
                timestamp,
                channel,
                data,
                tags: _tags,
            } = event;

            const tags = _tags.join(', ');

            let type = 'log';
            let message = undefined;

            const error = _error as Boom.Boom;

            if (error) {
                type = 'error';
                message = error.message;
            }

            handler({
                type,
                message,
                timestamp,
                channel,
                tags,
                data,
            });
        });

        server.events.on('route', (route) => {

            const {
                path,
                method,
                auth
            } = route;

            handler({
                type: 'route',
                message: 'Route added',
                time: Date.now(),
                path,
                method,
                auth,
            });
        });
    }
}

export default {
    plugin
};