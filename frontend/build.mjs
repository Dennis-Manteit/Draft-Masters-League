import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
const source = dirname(fileURLToPath(import.meta.url));
const out = resolve(source, '../dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const folder of ['assets', 'css']) cpSync(resolve(source, folder), resolve(out, folder), { recursive: true });
await build({ entryPoints: [resolve(source, 'js/auth.js')], bundle: true, splitting: true, minify: true, format: 'esm', platform: 'browser', outdir: resolve(out, 'js'), chunkNames: 'chunks/[name]-[hash]' });
const version = createHash('sha256').update(readFileSync(resolve(out, 'js/auth.js'))).digest('hex').slice(0, 12);
for (const page of ['index.html', 'login.html', 'create-account.html', 'verification.html', 'account.html', 'terms-and-conditions.html', 'privacy-policy.html']) {
  const html = readFileSync(resolve(source, page), 'utf8').replace('src="js/auth.js"', `src="js/auth.js?v=${version}"`);
  writeFileSync(resolve(out, page), html);
}
console.log('Built DML frontend with preserved branding and lazy view chunks.');
