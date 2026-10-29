import { parentPort, workerData } from 'node:worker_threads';
import { serveWorker } from '../worker-serve.js';
import { answerGraph, RouteGraph, type GraphReply, type GraphRequest } from './route-graph.js';

export type { GraphReply, GraphRequest } from './route-graph.js';

if (parentPort) {
  const graph = new RouteGraph((workerData as { cacheDir: string | null } | undefined)?.cacheDir ?? null);
  serveWorker<GraphRequest, GraphReply>(parentPort, async (request) => ({ result: await answerGraph(graph, request) }));
}
