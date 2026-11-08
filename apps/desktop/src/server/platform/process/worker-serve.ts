import type { MessagePort, Transferable } from "node:worker_threads";

import type { WorkerReply, WorkerRequest } from "./worker-protocol.js";

interface WorkerAnswer<Result> {
  readonly result: Result;
  readonly transfer: Transferable[];
}

const runRequest = async <Query, Result>(
  port: MessagePort,
  message: WorkerRequest<Query>,
  handle: (request: Query) => Promise<WorkerAnswer<Result>>
): Promise<void> => {
  try {
    const answer = await handle(message.request);

    const reply: WorkerReply<Result> = {
      id: message.id,
      result: answer.result,
    };

    port.postMessage(reply, answer.transfer);
  } catch (error) {
    let text = String(error);

    if (error instanceof Error) {
      text = error.message;
    }

    const reply: WorkerReply<Result> = { error: text, id: message.id };

    port.postMessage(reply);
  }
};

const startWorker = <Query, Result>(
  port: MessagePort,
  handle: (request: Query) => Promise<WorkerAnswer<Result>>
): void => {
  port.on("message", (message: WorkerRequest<Query>) => {
    void runRequest(port, message, handle);
  });
};

export { startWorker };

export type { WorkerAnswer };
