declare module 'markdown-it-abbr' {

    import MarkdownIt from 'markdown-it';
    export default function abbr(md: MarkdownIt): void;
}

declare module 'markdown-it-emoji' {
    import MarkdownIt from 'markdown-it';
    const plugin = function emoji(md: MarkdownIt): void;
    export default {
        bare: plugin,
        full: plugin,
        light: plugin,
    };
}

declare module 'markdown-it-footnote' {
    import MarkdownIt from 'markdown-it';
    export default function footnote(md: MarkdownIt): void;
}