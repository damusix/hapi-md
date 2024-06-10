import { ServerMethodOptions} from '@hapi/hapi';
import MarkdownIt from 'markdown-it';
import MarkdownItFm from 'markdown-it-front-matter';
import MarkdownItAbbr from 'markdown-it-abbr';
import MarkdownItEmoji from 'markdown-it-emoji';
import MarkdownItFootnote from 'markdown-it-footnote';
import MarkdownItDO from '@digitalocean/do-markdownit';
import Yaml from 'yaml';

import { sha1, inMinutes, inHours } from '../../helpers';


type MdFileMetadata = {
    slug: string;
    title: string;
    description: string;
    tags: string[];
} & Record<string, unknown>;

const internals = {

    _currentMetadata: [] as MdFileMetadata[],

    getFrontmatterYaml(fm: string) {
        internals._currentMetadata.push(Yaml.parse(fm));
    }
};

const markdown = new MarkdownIt({
    breaks: true,
    html: true,
    linkify: true,
    typographer: true,
    xhtmlOut: true,
    highlight(str, lang, attrs) {

        return `<pre><code class="language-${lang}">${str}</code></pre>`;
    },
})
    .use(MarkdownItDO, {})
    .use(MarkdownItFm, internals.getFrontmatterYaml)
    .use(MarkdownItAbbr)
    .use(MarkdownItEmoji.full)
    .use(MarkdownItFootnote)
;

const method = async (_: string, text: string) => {

    const html = markdown.render(text);

    return {
        html,
        metadata: internals._currentMetadata.pop()
    };
}

const options: ServerMethodOptions = {
    bind: {
        markdown,
    },
    cache: {
        cache: 'memory',
        segment: 'markdown',
        expiresIn: inHours(24),
        generateTimeout: 1000,
        staleIn: inHours(1),
        staleTimeout: 100,
    },

    generateKey(path:string, text: string) {

        return sha1(path + text);
    },
}

declare module '@hapi/hapi' {

    interface ServerMethods {
        markdown: typeof method;
    }
}

export default {
    name: 'markdown',
    method,
    options
};