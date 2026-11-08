import { parentPort, workerData } from "node:worker_threads";

import { startWorker } from "../platform/process/index.js";
import { answerGraph, RouteGraph } from "./route-graph.js";
import type { GraphReply, GraphRequest } from "./route-graph.js";

export type { GraphReply, GraphRequest } from "./route-graph.js";

if (parentPort) {
  const graph = new RouteGraph(
    (workerData as { cacheDir: string | null } | undefined)?.cacheDir ?? null
  );

  startWorker<GraphRequest, GraphReply>(parentPort, async (request) => ({
    result: await answerGraph(graph, request),
    transfer: [],
  }));
}
