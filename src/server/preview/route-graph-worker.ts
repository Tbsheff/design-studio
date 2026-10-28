import { parentPort, workerData } from 'node:worker_threads';
import { RouteGraph, type ContentStamp } from './route-graph.js';

export interface GraphRequest {
  id: number;
  workTree: string;
  roots: string[];
}

export type GraphReply = { id: number; stamp: ContentStamp | null } | { id: number; error: string } | { flushed: true };

const port = parentPort;
if (port) {
  const graph = new RouteGraph((workerData as { cacheDir: string | null } | undefined)?.cacheDir ?? null);
  port.on('message', (message: GraphRequest | 'flush') => {
    if (message === 'flush') {
      void graph.flush().then(() => port.postMessage({ flushed: true } satisfies GraphReply));
      return;
    }
    graph.stamp(message.workTree, message.roots).then(
      (stamp) => port.postMessage({ id: message.id, stamp } satisfies GraphReply),
      (error: unknown) => port.postMessage({ id: message.id, error: error instanceof Error ? error.message : String(error) } satisfies GraphReply),
    );
  });
}
