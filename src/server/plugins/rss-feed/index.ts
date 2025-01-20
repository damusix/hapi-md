import { Plugin, RouteOptionsApp, Server } from '@hapi/hapi';
import Hoek from '@hapi/hoek';
import Xml from 'xml-js';

/**
 * TODO: Fix this
 *
 * Generates an RSS feed for the server based on routes
 * that have been defined in the server. It uses route
 * configuration options to determine whether to exclude
 * routes from the feed.
 */
export const rssFeed = (server: Server) => {

    const {
        url,
        data: {
            metadata,
        },
    } = server.appSettings();

    const defaultMetaData = (meta: RouteOptionsApp) => {

        return Hoek.applyToDefaults(metadata, meta) as RouteOptionsApp;
    }

    const routeTable = server.table();

    const items = routeTable.map(
        (route) => {

            const {
                publishedAt,
                updatedAt,
                title,
                image: imagePath,
                description,
                author,
                keywords,
                excludeFromFeed,
            } = defaultMetaData(route.settings.app);

            if (excludeFromFeed) {
                return null;
            }

            const _url = new URL(url)
            _url.pathname = route.path

            const link = _url.toString()

            let image = imagePath;

            if (imagePath && !imagePath.startsWith('http')) {
                _url.pathname = imagePath;
                image = _url.toString();
            };

            return {
                title,
                link,
                description,
                author,
                tags: keywords,
                // RFC-822 date-time
                pubDate: new Date(publishedAt).toUTCString(),
                date_modified: new Date(updatedAt).toUTCString(),
                image,
            }
        }
    )
    .filter(Boolean)
    .sort(
        (a, b) => (
            new Date(b.date_modified ?? '0').getTime() - new Date(a.date_modified ?? '0').getTime()
        )
    )

    return Xml.js2xml({
        _declaration: {
            _attributes: {
                version: '1.0',
                encoding: 'utf-8',
            }
        },
        rss: {
            _attributes: {
                version: '2.0',
            },
            channel: {
                title: metadata.title,
                description: metadata.description,
                link: url,
                item: items,
            }
        }
    }, {
        compact: true,
        ignoreComment: true,
        ignoreDeclaration: true,
        ignoreInstruction: true,
    })

}

const plugin = {
    name: 'rss-feed',
    register: async (server, options) => {

        server.ext('onPostStart', () => {

            const feed = rssFeed(server);

            server.route({
                method: 'GET',
                path: '/rss.xml',
                handler: (_, h) => h.response(feed).type('application/rss+xml')
            })
        });
    }
} as Plugin<any> & { name: string; version: string };

export default plugin;