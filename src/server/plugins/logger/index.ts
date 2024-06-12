import { Plugin, ResponseObject, Request } from '@hapi/hapi';
import Boom from '@hapi/boom';
import Hoek from '@hapi/hoek'

type LogEvent = {
    time: number;
    type: 'request' | 'server' | 'error' | 'log';

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
    const err = _response as Boom.Boom

    let statusCode = response.statusCode;
    let type = 'request';

    if (
        err.isBoom ||
        (response.statusCode && response.statusCode >= 400)

    ) {
        type = 'error';
        statusCode = response.statusCode || err.output.statusCode;
    }

    const ip = headers['x-forwarded-for'] || remoteAddress;

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
        query: filters.queryFilter(query),
        params: filters.paramsFilter(params),
        payload: filters.payloadFilter(payload),
        headers: filters.headersFilter(headers),
        state: filters.stateFilter(state),
        auth,
        pre,
    }

    for (const key of omit) {
        delete _log[key];
    }

    if (pick && pick.length !== 0) {

        const picked = {} as Record<string, any>;

        for (const key of pick) {
            picked[key] = _log[key];
        }

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
            });

            handler(_log);
        });

        server.events.on('start', () => {

            handler({
                type: 'server',
                message: 'Server started',
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
                type: 'error',
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
                type: 'server',
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