import { toMergedElement } from "./structure.js";
import type { Structure } from "./structure.js";

type Transformer = "none" | "plain" | "superjson";

interface ObservedCall {
  readonly method: string;
  readonly path: string;
  readonly procedure: string | null;
  readonly status: number;
  readonly structure: Structure | null;
  readonly transformer: Transformer;
}

interface CallSet {
  readonly calls: readonly ObservedCall[];
  readonly isTruncated: boolean;
  readonly opaqueCount: number;
}

const MAX_CALLS = 40;

const toCallKey = (call: ObservedCall): string => `${call.method} ${call.path}`;

const toMergedCall = (
  left: ObservedCall,
  right: ObservedCall
): ObservedCall => ({
  ...left,
  structure: toMergedElement(left.structure, right.structure),
});

const toCallSet = (observed: readonly ObservedCall[]): CallSet => {
  const byKey = new Map<string, ObservedCall>();
  const distinct = new Set<string>();

  for (const call of observed) {
    const key = toCallKey(call);
    const previous = byKey.get(key) ?? null;

    distinct.add(key);

    if (previous === null && byKey.size < MAX_CALLS) {
      byKey.set(key, call);
    }

    if (previous !== null) {
      byKey.set(key, toMergedCall(previous, call));
    }
  }

  const calls = [...byKey.values()];

  return {
    calls,
    isTruncated: distinct.size > calls.length,
    opaqueCount: calls.filter((call) => call.structure === null).length,
  };
};

export { MAX_CALLS, toCallSet };

export type { CallSet, ObservedCall, Transformer };
