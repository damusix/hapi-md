import Fs from 'fs';
import Path from 'path';

import { Plugin, ResponseObject, Request } from '@hapi/hapi';
import Boom from '@hapi/boom';
import Hoek from '@hapi/hoek'

import MarkdownMethod from './method';
import Joi from 'joi';

const internals = {

    docsPath: Path.resolve(__dirname, '../../../docs'),
    findMarkdownFiles: (path: string) => {

        const files = Fs.readdirSync(path);
        const markdownFiles = files.filter((file) => file.endsWith('.md'));
        const directories = files.filter((file) => Fs.statSync(`${path}/${file}`).isDirectory());

        directories.forEach((directory) => {

            const subFiles = internals.findMarkdownFiles(`${path}/${directory}`);
            markdownFiles.push(...subFiles.map((file) => `${directory}/${file}`));
        });

        return markdownFiles;
    }
}

const frontmatterSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    tags: Joi.array().items(Joi.string()),
    date: Joi.date().required(),
    published: Joi.boolean().default(false),
    slug: Joi.string(),
    image: Joi.string().uri(),

    httpHeaders: Joi.object().pattern(
        Joi.string(),
        Joi.string()
    )
});


const plugin: Plugin<unknown> = {

    name: 'md-docs',
    async register(server) {

        server.method(
            MarkdownMethod.name,
            MarkdownMethod.method,
            MarkdownMethod.options,
        );

        const mdFiles = internals.findMarkdownFiles(internals.docsPath);

        for (const mdFile of mdFiles) {

            const content = Fs.readFileSync(`${internals.docsPath}/${mdFile}`, 'utf8');

            const { metadata: _meta, html } = await server.methods.markdown(mdFile, content);

            Hoek.assert(_meta, Boom.badImplementation(`No frontmatter found in ${mdFile}`));
            const { error, value: metadata } = frontmatterSchema.validate(_meta);

            if (error) {
                error.cause = `docs/${mdFile}`
            }

            Hoek.assert(!error, error);

            let slugPath = mdFile.replace('.md', '');

            if (metadata.slug) {
                slugPath = mdFile.replace(Path.basename(mdFile), metadata.slug);
            }

            metadata.slug = Path.join('/docs', slugPath);

            server.route({
                method: 'GET',
                path: metadata.slug,
                handler(_: Request, h) {

                    let res = h
                        .response(html)
                        .type('text/html')
                        .code(200)
                    ;

                    if (metadata.httpHeaders) {

                        Object.entries(metadata.httpHeaders).forEach(([key, val]) => {

                            res = res.header(key, val as string);
                        });
                    }

                    return res;
                }
            });
        }
    },
}

export default {
    plugin
};