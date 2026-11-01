import type { MessagePort, Transferable } from "node:worker_threads";

import type {
  WorkerReply,
  WorkerRequest,
} from "./platform/process/worker-protocol.js";

export interface WorkerAnswer<R> {
  result: R;
  transfer?: Transferable[];
}

export function serveWorker<Q, R>(
  port: MessagePort,
  handle: (request: Q) => Promise<WorkerAnswer<R>>
): void {
  port.on("message", (message: WorkerRequest<Q>) => {
    if (typeof message !== "object" || message === null || !("id" in message)) {
      return;
    }

    handle(message.request).then(
      ({ result, transfer }) =>
        port.postMessage(
          { id: message.id, result } satisfies WorkerReply<R>,
          transfer ?? []
        ),
      (error: unknown) =>
        port.postMessage({
          id: message.id,
          error: error instanceof Error ? error.message : String(error),
        } satisfies WorkerReply<R>)
    );
  });
}
