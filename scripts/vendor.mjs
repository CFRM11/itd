// Copia el CSS de Pico (versión classless) a web/vendor tras `npm install`.
// Se vendoriza (no CDN) para que la app funcione offline y dentro de Tauri.
import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const dest = path.join(root, 'web', 'vendor');

const picoDir = path.join(path.dirname(require.resolve('@picocss/pico/package.json')), 'css');

await mkdir(dest, { recursive: true });
await copyFile(path.join(picoDir, 'pico.classless.min.css'), path.join(dest, 'pico.classless.min.css'));
console.log('✔ Pico classless copiado a web/vendor');
