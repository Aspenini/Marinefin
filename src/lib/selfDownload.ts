/**
 * The built client is a single self-contained HTML file, so a hosted copy can hand itself out.
 * Only offered on remote HTTPS hosts (e.g. GitHub Pages); local dev and file:// copies don't need it.
 */
const LOCAL_HOST = /^(localhost|127(\.\d+){3}|\[::1\])$|\.(local|localhost)$/i;

export const canDownloadSelf = location.protocol === 'https:' && !LOCAL_HOST.test(location.hostname);

/** Same-origin URL of this page without the hash route; a `download` link to it saves the built file. */
export const selfUrl = location.pathname;

export const SELF_FILENAME = 'Marinefin.html';
