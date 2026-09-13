import { readdirSync, statSync } from 'node:fs';

const files = readdirSync('dist');
if (files.length !== 1 || files[0] !== 'index.html') {
  throw new Error(`Expected dist/index.html only, found: ${files.join(', ')}`);
}

const html = await Bun.file('dist/index.html').text();
if (/<script\b[^>]*\bsrc=/.test(html)) {
  throw new Error('Built HTML still references an external script');
}
if (/<link\b[^>]*\bhref="(?!data:)/.test(html)) {
  throw new Error('Built HTML still references an external stylesheet');
}
if (!html.includes('data:font/woff2')) {
  throw new Error('Fonts were not inlined into the HTML file');
}

const bytes = statSync('dist/index.html').size;
console.log(`Single-file build OK (${bytes.toLocaleString()} bytes)`);
