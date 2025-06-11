import Fs from 'fs';
import Path from 'path';

import { Plugin, Request, RouteOptionsCache } from '@hapi/hapi';
import * as Boom from '@hapi/boom';
import * as Hoek from '@hapi/hoek'

import MarkdownMethods from './method.ts';
import Joi from 'joi';

declare module '@hapi/hapi' {
    interface RouteOptionsApp {
        publishedAt?: Date;
        updatedAt?: Date;
        title?: string;
        description?: string;
        image?: string;
        author?: string;
        keywords?: string;
        excludeFromFeed?: boolean;
    }
}

const docsPath = Path.resolve(import.meta.dirname, '../../../docs');

const findMarkdownFiles = (path: string) => {

    const files = Fs.readdirSync(path);
    const markdownFiles = files.filter((file) => file.endsWith('.md'));
    const directories = files.filter((file) => Fs.statSync(`${path}/${file}`).isDirectory());

    directories.forEach((directory) => {

        const subFiles = findMarkdownFiles(`${path}/${directory}`);
        markdownFiles.push(...subFiles.map((file) => `${directory}/${file}`));
    });

    return markdownFiles;
}

type Frontmatter = {
    title: string;
    description: string;
    image: string;
    author: string;

    slug: string;
    date: Date;
    tags: string[];
    published: boolean;

    layout: string;

    httpHeaders: Record<string, string>;
    cache: RouteOptionsCache;

    meta: {
        fbTitle: string;
        fbDescription: string;
        fbImage: string;

        twTitle: string;
        twDescription: string;
        twImage: string;
        twAuthor: string;
    }
}

const frontmatterSchema = Joi.object<Frontmatter>({
    title: Joi.string().required(),
    description: Joi.string().required(),
    tags: Joi.array().items(Joi.string()),
    date: Joi.date().required(),
    published: Joi.boolean().default(false),
    slug: Joi.string(),
    image: Joi.string().uri(),
    layout: Joi.string().default('main'),

    cache: Joi.alternatives().try(
        Joi.object({
            expiresIn: Joi.number(),
            expiresAt: Joi.string(),
            privacy: Joi.string(),
            statuses: Joi.array().items(Joi.number()),
            otherwise: Joi.string(),
        }),
        Joi.boolean()
    ),

    httpHeaders: Joi.object().pattern(
        Joi.string(),
        Joi.string()
    ),
    meta: Joi.object({

    }),
});


const plugin: Plugin<unknown> = {

    name: 'md-docs',
    async register(server) {

        MarkdownMethods.forEach((method) => {

            server.method(
                method.name,
                method.method,
                method.options,
            );
        });

        const mdFiles = findMarkdownFiles(docsPath);

        for (const mdFile of mdFiles) {

            const content = Fs.readFileSync(`${docsPath}/${mdFile}`, 'utf8');
            const stat = Fs.statSync(`${docsPath}/${mdFile}`);

            const { metadata: _meta, html } = await server.methods.markdown(mdFile, content);

            Hoek.assert(_meta, Boom.badImplementation(`No frontmatter found in ${mdFile}`));

            const { error, value: _metadata } = frontmatterSchema.validate(_meta);

            if (error) {
                (error as any).cause = `docs/${mdFile}`
            }

            Hoek.assert(!error, error);

            const metadata: Frontmatter = _metadata;

            if (!metadata.published) {
                continue;
            }

            let slugPath = mdFile.replace('.md', '');

            if (metadata.slug) {
                slugPath = mdFile.replace(Path.basename(mdFile), metadata.slug);
            }

            metadata.slug = Path.join('/docs', slugPath);

            const publishedAt = metadata.date ? new Date(metadata.date) : undefined;
            const updatedAt = stat.mtime < (publishedAt || 0) ? publishedAt : stat.mtime;

            const meta = {
                updatedAt,
                publishedAt,
                title: metadata.title,
                description: metadata.description,
                image: metadata.image,
                author: metadata.author,
                keywords: Array.isArray(metadata.tags) ? metadata.tags.join(',') : (metadata.tags || ''),
                ...metadata.meta,
            }

            server.route({
                method: 'GET',
                path: metadata.slug,
                handler(_: Request, h) {

                    const today = new Date();

                    if (publishedAt && today < publishedAt) {

                        return Boom.notFound();
                    }

                    const context = { meta, html };
                    const viewOpts = { layout: metadata.layout };

                    let res = h.view('docs', context, viewOpts);

                    if (metadata.httpHeaders) {

                        Object.entries(metadata.httpHeaders).forEach(([key, val]) => {

                            res = res.header(key, val as string);
                        });
                    }

                    return res;
                },
                options: {
                    cache: metadata.cache,
                    app: {
                        publishedAt,
                        updatedAt,
                        title: metadata.title,
                        description: metadata.description,
                        image: metadata.image,
                        author: metadata.author,
                        keywords: metadata.tags?.join(',') || '',
                    }
                }
            });
        }
    },
}

export default {
    plugin
};