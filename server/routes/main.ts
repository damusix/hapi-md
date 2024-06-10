import { ServerRoute } from '@hapi/hapi'

const home: ServerRoute = {
    method: 'GET',
    path: '/',
    handler: (request, h) => {
        return 'Hello World!';
    }
}

export default [
    home
];