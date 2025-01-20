import { ServerRoute } from '@hapi/hapi'

const assets: ServerRoute = {
    method: 'GET',
    path: '/assets/{param*}',
    handler: {
        directory: {
            path: '.',
            redirectToSlash: true,
            index: true,
            listing: true
        }
    },
    options: {
        app: {
            excludeFromFeed: true,
        },
        cache: {
            expiresIn: 60 * 60 * 24 * 30, // 30 days
            privacy: 'private',
        }
    }
}

export default [
    assets
];