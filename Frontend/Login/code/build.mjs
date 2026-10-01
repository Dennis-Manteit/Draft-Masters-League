import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const code = dirname(fileURLToPath(import.meta.url));
const root = resolve(code, '../../..');
const out = resolve(root, '.hosting');
rmSync(out, { recursive: true, force: true });
mkdirSync(resolve(out, 'assets'), { recursive: true });

const pages = ['index.html', 'create-account.html', 'verification.html', 'terms-and-conditions.html', 'privacy-policy.html'];
for (const page of pages) {
  const source = readFileSync(resolve(code, page), 'utf8');
  const html = source.replaceAll('../../../Backend/Images/Website%20Page/DML_Shield_Green_Colourway_Transparent.png', 'assets/DML_Shield_Green_Colourway_Transparent.png');
  writeFileSync(resolve(out, page), html);
}
const css = readFileSync(resolve(code, 'styles.css'), 'utf8')
  .replace('../../Operations/Login/Images/DML_Auth_Stadium_Background.webp', 'assets/DML_Auth_Stadium_Background.webp');
writeFileSync(resolve(out, 'styles.css'), css);
copyFileSync(resolve(root, 'Frontend/Operations/Login/Images/DML_Auth_Stadium_Background.webp'), resolve(out, 'assets/DML_Auth_Stadium_Background.webp'));
copyFileSync(resolve(root, 'Backend/Images/Website Page/DML_Shield_Green_Colourway_Transparent.png'), resolve(out, 'assets/DML_Shield_Green_Colourway_Transparent.png'));
console.log('Built public login site:', pages.length, 'pages and 2 images');
