import { ServerMethodOptions} from '@hapi/hapi';

import MarkdownIt from 'markdown-it';
import MarkdownItAnchor from 'markdown-it-anchor';
import MarkdownItTOC from 'markdown-it-table-of-contents';
import MarkdownItFm from 'markdown-it-front-matter';
import MarkdownItAbbr from 'markdown-it-abbr';
import * as MarkdownItEmoji from 'markdown-it-emoji';
import MarkdownItFootnote from 'markdown-it-footnote';
import MarkdownTaskList from 'markdown-it-task-lists';

import Yaml from 'yaml';

import { sha1, inHours } from '../../helpers/index.ts';

declare module '@hapi/hapi' {

    interface ServerMethods {
        markdown: typeof generateMarkdown;
        addTocToMarkdown: typeof addTocToMarkdown;
    }
}

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
    .use(MarkdownItFm, internals.getFrontmatterYaml)
    .use(MarkdownItAbbr)
    .use(MarkdownItEmoji.full)
    .use(MarkdownItFootnote)
    .use(MarkdownItAnchor)
    .use(MarkdownTaskList)
    .use(MarkdownItTOC)
;

const generateMarkdown = async (_: string, text: string) => {

    const html = markdown.render(text);

    return {
        html,
        metadata: internals._currentMetadata.pop()
    };
}

const addTocToMarkdown = async (text: string) => {

    const _content = text;

    const h1 = _content.match(/^# (.*)/m)?.[1];
    let toc = `[[toc]]\n\n`;
    let content = _content;

    if (h1) {
        toc = `# ${h1}<!-- omit from toc -->\n\n${toc}`;
        content = _content.replace(`# ${h1}`, '');
    }

    return toc + content;
}


const options: (segment: string) => ServerMethodOptions = (segment) => ({
    bind: {
        markdown,
    },
    cache: {
        cache: 'memory',
        segment,
        expiresIn: inHours(24),
        generateTimeout: 1000,
        staleIn: inHours(1),
        staleTimeout: 10,
    },

    generateKey(...args: any[]) {

        return sha1(JSON.stringify(args));
    },
});


export default [
    {
        name: 'markdown',
        method: generateMarkdown,
        options: options('markdown')
    },
    {
        name: 'addTocToMarkdown',
        method: addTocToMarkdown,
        options: options('addTocToMarkdown')
    }
];
