import StaticRoutes from './static';
import MainRoutes from './main';
import PoliciesRoutes from './policies';

export default [
    ...StaticRoutes,
    ...MainRoutes,
    PoliciesRoutes
];