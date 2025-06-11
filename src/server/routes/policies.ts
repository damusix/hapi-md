import { Server, ServerRoute } from '@hapi/hapi'
import * as Hoek from '@hapi/hoek';

const getPolicies: (server: Server) => ServerRoute[] = (server) => {

    const _policies = server.appSettings().data.policies;

    const policies = _policies.map(({ slug, title, description }) => ({
        slug,
        title,
        description,
    }));

    const policyRoutes: ServerRoute[] = _policies.map((policy) => {

        const {
            title,
            description,
            slug,
            githubLink,
            metadata,
        } = policy;

        return {
            method: 'GET',
            path: `/policies/${policy.slug}`,
            handler: async (req, h) => {

                const [ghApi, filePath] = githubLink.split('/contents/');
                const commitLink = `${ghApi}/commits?path=${encodeURIComponent(filePath)}`;

                const _content = await req.server.methods.ghContent(githubLink);
                const updatedAt = await req.server.methods.ghLastUpdated(commitLink);
                const content = await req.server.methods.addTocToMarkdown(_content);

                const { html, metadata } = await req.server.methods.markdown(githubLink, content);

                const meta = Hoek.merge(metadata || {}, {
                    title,
                    description,
                    slug,
                    updatedAt,
                    ...metadata,
                });

                return h.view('policies', { html, meta, policies });
            },
            options: {
                app: {
                    title,
                    description,
                    slug,
                    ...metadata,
                }
            }
        }
    });

    return [
        ...policyRoutes,
        {
            method: 'GET',
            path: '/policies',
            handler: (request, h) => {

                return h
                    .redirect('/policies/coc')
                    .temporary()
                ;
            }
        }
    ]
}

export default getPolicies;