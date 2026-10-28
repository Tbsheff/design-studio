import { parentPort, workerData } from 'node:worker_threads';
import { serveWorker } from '../worker-serve.js';
import { RouteGraph, type ContentStamp } from './route-graph.js';

export type GraphRequest = { kind: 'stamp'; workTree: string; roots: string[] } | { kind: 'flush' };

if (parentPort) {
  const graph = new RouteGraph((workerData as { cacheDir: string | null } | undefined)?.cacheDir ?? null);
  serveWorker<GraphRequest, ContentStamp | null>(parentPort, async (request) => {
    if (request.kind === 'flush') {
      await graph.flush();
      return { result: null };
    }
    return { result: await graph.stamp(request.workTree, request.roots) };
  });
}
