import Prism from '@digitalocean/do-markdownit/vendor/prismjs';
import PrismToolbar from '@digitalocean/do-markdownit/vendor/prismjs/plugins/toolbar/prism-toolbar';
import CopyToClipboard from '@digitalocean/do-markdownit/vendor/prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard';


PrismToolbar(Prism);
CopyToClipboard(Prism);

document.addEventListener('DOMContentLoaded', () => {

    // Initialize Prism
    Prism.highlightAll();
});