type WorkerReply<Reply> =
  | { id: number; result: Reply }
  | { id: number; error: string };

interface WorkerRequest<Query> {
  id: number;
  request: Query;
}

export type { WorkerReply, WorkerRequest };
