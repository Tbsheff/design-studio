import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outfile = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'dist', 'worker.js');

await build({
  entryPoints: [path.join(root, 'src', 'index.ts')],
  outfile,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2023',
  minify: false,
  legalComments: 'none',
  logLevel: 'warning',
});
console.log(outfile);
