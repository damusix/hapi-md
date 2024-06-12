import { ServerRoute } from '@hapi/hapi'

const home: ServerRoute = {
    method: 'GET',
    path: '/',
    handler: (request, h) => {

        return h.view('home');
    }
}

export default [
    home
];