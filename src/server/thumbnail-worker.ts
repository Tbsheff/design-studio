import { parentPort } from 'node:worker_threads';
import { halfSize } from './half-size.js';
import { serveWorker } from './worker-serve.js';

if (parentPort) {
  serveWorker<Uint8Array, Uint8Array>(parentPort, async (png) => {
    const out = new Uint8Array(halfSize(Buffer.from(png.buffer, png.byteOffset, png.byteLength)));
    return { result: out, transfer: [out.buffer] };
  });
}
