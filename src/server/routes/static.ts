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
    }
}

export default [
    assets
];