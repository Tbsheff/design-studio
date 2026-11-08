import { parentPort } from "node:worker_threads";

import { halfSize } from "./platform/half-size/index.js";
import { startWorker } from "./platform/process/index.js";

if (parentPort) {
  startWorker<Uint8Array, Uint8Array>(parentPort, async (png) => {
    const out = new Uint8Array(
      halfSize(Buffer.from(png.buffer, png.byteOffset, png.byteLength))
    );

    return { result: out, transfer: [out.buffer] };
  });
}
