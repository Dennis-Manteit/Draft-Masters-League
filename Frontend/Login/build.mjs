import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';

const code = dirname(fileURLToPath(import.meta.url));
const root = resolve(code, '../..');
const out = resolve(root, 'Backend/Firebase/public');
rmSync(out, { recursive: true, force: true });
mkdirSync(resolve(out, 'assets'), { recursive: true });

const pages = ['index.html', 'create-account.html', 'verification.html', 'account.html', 'terms-and-conditions.html', 'privacy-policy.html'];
for (const page of pages) {
  const source = readFileSync(resolve(code, page), 'utf8');
  const html = source.replaceAll('../../Backend/Images/DML_Shield_Green_Colourway_Transparent.png', 'assets/DML_Shield_Green_Colourway_Transparent.png');
  writeFileSync(resolve(out, page), html);
}
const css = readFileSync(resolve(code, 'styles.css'), 'utf8')
  .replace('../Operations/Login/Images/DML_Auth_Stadium_Background.webp', 'assets/DML_Auth_Stadium_Background.webp');
writeFileSync(resolve(out, 'styles.css'), css);
await build({ entryPoints: [resolve(code, 'auth-client.js')], bundle: true, minify: true, format: 'esm', platform: 'browser', outfile: resolve(out, 'auth.js') });
copyFileSync(resolve(root, 'Frontend/Operations/Login/Images/DML_Auth_Stadium_Background.webp'), resolve(out, 'assets/DML_Auth_Stadium_Background.webp'));
copyFileSync(resolve(root, 'Backend/Images/DML_Shield_Green_Colourway_Transparent.png'), resolve(out, 'assets/DML_Shield_Green_Colourway_Transparent.png'));
console.log('Built public login site:', pages.length, 'pages and 2 images');
