declare module 'markdown-it-abbr' {

    import MarkdownIt from 'markdown-it';
    export default function abbr(md: MarkdownIt): void;
}

declare module 'markdown-it-emoji' {

    import MarkdownIt from 'markdown-it';
    const plugin: (md: MarkdownIt) => void;

    const emoji: {
        bare: typeof plugin,
        full: typeof plugin,
        light: typeof plugin
    };

    export default emoji;
}

declare module 'markdown-it-footnote' {
    import MarkdownIt from 'markdown-it';
    export default function footnote(md: MarkdownIt): void;
}