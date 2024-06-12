import { Plugin, Server, ServerRegisterPluginObject, ServerRegisterPluginObjectWrapped } from '@hapi/hapi'
import { stringify } from '@hapi/hoek'

import Inert from '@hapi/inert'


import { MaybePromise, OneOrMany, ServerDependentFn } from '../helpers';

import DevWatch from './_dev/watch';

import Logger, { LoggerOpts } from './logger'
import MdDocs from './md-docs';
import VisionPlugins from './vision';

const loggerPlugin: ServerRegisterPluginObject<LoggerOpts> = {

    plugin: Logger,
    options: {
        handler: (obj) => process.stdout.write(stringify(obj) + '\n'),
        pick: [
            'method',
            'path',
            'query',
            'statusCode',
            'time',
            'message'
        ],
    }
}

const inertPlugin: ServerRegisterPluginObject<Inert.OptionalRegistrationOptions> = {
    plugin: Inert,
    options: {}
}

type PluginConfigs = (

    Plugin<any> |
    ServerRegisterPluginObject<any>
);

type PluginConfigFn = ServerDependentFn<OneOrMany<PluginConfigs>>;

const plugins: (
    OneOrMany<PluginConfigs> |
    OneOrMany<PluginConfigFn>
)[] = [

    loggerPlugin,
    inertPlugin,
    ...VisionPlugins,
    MdDocs,
    DevWatch
]
export default plugins;