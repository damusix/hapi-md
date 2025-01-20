import { Server, ServerMethodOptions } from '@hapi/hapi';
import Wreck from '@hapi/wreck';
import Bourne from '@hapi/bourne';
import { inHours, MethodConfig, sha1 } from '../helpers';

declare module '@hapi/hapi' {
    interface ServerMethods {
        githubGet: <T>(link: string) => Promise<T>;
        githubPost: <T>(link: string, body: any) => Promise<T>;
        ghContent: (link: string) => Promise<string>;
        ghLastUpdated: (link: string) => Promise<string>;
    }
}

export type GhContentResponse = {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    html_url: string;
    git_url: string;
    download_url: string;
    type: string;
    content: string;
    encoding: string;
    _links: {
        self: string;
        git: string;
        html: string;
    }
}

type GhCommitResponse = {
    sha: string;
    node_id: string;
    commit: {
        author: {
            name: string;
            email: string;
            date: string;
        }
    }
}

type GhGraphqlAllReposResponse = {
    data: {
        organization: {
            repositories: {
                nodes: Array<{
                    name: string;
                    description: string | null;
                    url: string;
                    isArchived: boolean;
                    updatedAt: string;
                    stargazerCount: number;
                    defaultBranchRef: {
                        name: string;
                    } | null;
                    repositoryTopics: {
                        nodes: Array<{
                            topic: {
                                name: string;
                            };
                        }>;
                    };
                }>;
            };
        };
    };
};

export default (server: Server) => {

    const { githubToken } = server.appSettings();


    const instance = Wreck.defaults({
        headers: {
            'Authorization': `token ${githubToken}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    const githubGet = async <T>(link: string) => {

        const { payload } = await instance.get<Buffer>(link);

        const data = Bourne.parse(payload.toString('utf-8'));

        return data as T;
    };

    const githubPost = async <T>(link: string, body: any) => {

        const { payload } = await instance.post<Buffer>(link, body);

        const data = Bourne.parse(payload.toString('utf-8'));

        return data as T;
    };

    const allReposQuery = `
        query {
            organization(login: "hapijs") {
                repositories(first: 100, orderBy: {field: UPDATED_AT, direction: DESC}) {
                    nodes {
                        name
                        description
                        url
                        isArchived
                        updatedAt
                        stargazerCount
                        defaultBranchRef {
                            name
                        }
                        repositoryTopics(first: 10) {
                            nodes {
                                topic {
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
    `

    /**
     * Get all hapijs repos using the github graphql api
     */
    const ghGraphqlAllRepos = async () => {

        const { payload } = await instance.post<Buffer>(
            'https://api.github.com/graphql', {
                payload: { query: allReposQuery }
            }
        );

        const data = Bourne.parse(payload.toString('utf-8'));

        return data as T;
    };

    const ghContent = async (link: string) => {

        const data = await githubGet<GhContentResponse>(link);
        const raw = Buffer.from(data.content, 'base64').toString('utf-8');

        return raw;
    }

    const ghLastUpdated = async (link: string) => {

        const data = await githubGet<GhCommitResponse[]>(link);

        return data[0].commit.author.date;
    }

    const options: (segment: string) => ServerMethodOptions = (segment) => ({
        cache: {
            cache: 'memory',
            segment,
            expiresIn: inHours(4),
            generateTimeout: 1000,
            staleIn: inHours(1),
            staleTimeout: 10,
        },
        generateKey: (...args: any[]) => sha1(JSON.stringify(args))
    });

    return [
        { name: 'githubGet', method: githubGet, options: {} },
        { name: 'githubPost', method: githubPost, options: {} },
        { name: 'ghContent', method: ghContent, options: options('ghContent') },
        { name: 'ghLastUpdated', method: ghLastUpdated, options: options('ghLastUpdated') }
    ];
};