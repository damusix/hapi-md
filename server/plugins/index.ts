import { ServerRegisterPluginObject } from '@hapi/hapi'
import { stringify } from '@hapi/hoek'

import Logger, { LoggerOpts } from './logger'
import MdDocs from './md-docs';

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

export default [
    loggerPlugin,
    MdDocs
]