import type { Effect } from "effect";

interface EventRunner {
  readonly toPromise: <Value>(program: Effect.Effect<Value>) => Promise<Value>;
}

export type { EventRunner };
