import { Server } from '@hapi/hapi';
import { join } from 'path';


const viewHelpers = (server: Server) => {

    const { url, data: { metadata } } = server.appSettings();

    /**
     * Check if the path is an external link
     */
    const isExternalLink = (path: string) => path.startsWith('http');

    /**
     * Make an internal URL from the base URL and the paths
     */
    const makeUrl = (...paths: string[]) => {

        const u = new URL(url);

        u.pathname = join(u.pathname, ...paths);

        return u.toString();
    }

    // Makes an internal or external asset URL
    const assetUrl = (path: string) => isExternalLink(path) ? path : makeUrl('assets', path);

    // Makes an internal or external link URL
    const link = (path: string) => isExternalLink(path) ? path : makeUrl(path);

    // Check if the current path is the same as the path
    const isCurrent = (currentPath: string, path: string) => currentPath === path;

    // Check if the current path is the same as the path and returns a class name
    const isCurrentClass = (currentPath: string, path: string) => isCurrent(currentPath, path) ? 'current' : '';

    // Get the meta value or the default value
    const metaOrDefault = (value: string, key: keyof typeof metadata) => value || metadata[key];

    return {
        url,
        currentYear: () => new Date().getFullYear(),
        assetUrl,
        link,
        isCurrent,
        isCurrentClass,
        metaOrDefault
    }
}

export default viewHelpers;