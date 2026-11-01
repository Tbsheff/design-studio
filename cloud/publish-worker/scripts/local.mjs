import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { Miniflare } from 'miniflare';

const { values } = parseArgs({
  options: {
    script: { type: 'string' },
    persist: { type: 'string' },
    port: { type: 'string', default: '13770' },
    d1: { type: 'string' },
    bucket: { type: 'string', default: 'design-studio-publish' },
    secrets: { type: 'string' },
  },
});

if (!values.script || !values.persist || !values.d1 || !values.secrets) {
  console.error('usage: local.mjs --script worker.js --persist <state dir> --d1 <id> --secrets <secrets.json> [--port 13770]');
  process.exit(2);
}

const secrets = JSON.parse(await readFile(values.secrets, 'utf8'));
const root = path.join(values.persist, 'v3');
const mf = new Miniflare({
  modules: true,
  scriptPath: path.resolve(values.script),
  modulesRoot: path.dirname(path.resolve(values.script)),
  compatibilityDate: '2026-07-01',
  host: '127.0.0.1',
  port: Number(values.port),
  d1Databases: { DB: values.d1 },
  r2Buckets: { FILES: values.bucket },
  d1Persist: path.join(root, 'd1'),
  r2Persist: path.join(root, 'r2'),
  bindings: { PUBLISH_KEY_HASH: String(secrets.PUBLISH_KEY_HASH ?? '') },
});

const url = await mf.ready;
console.log(`publish worker local ready at ${url.href}`);

const stop = async () => {
  await mf.dispose().catch(() => undefined);
  process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
