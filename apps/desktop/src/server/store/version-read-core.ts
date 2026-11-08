import type {
  Direction,
  Project,
  VersionThumbs,
} from "@design-studio/contracts";
import { Effect } from "effect";

import type { VersionStore } from "../../shared/server-ports.js";
import type { EditHistory } from "../direct-edit/commit/index.js";
import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import {
  makeRuntimeSlot,
  requireBound,
} from "../platform/runtime-slot/index.js";
import type { StudioProjectStore } from "./projects.js";
import type { VersionNames } from "./version-names.js";

interface VersionReadRuntime {
  readonly history: EditHistory;
  readonly names: VersionNames;
  readonly projects: Pick<StudioProjectStore, "get" | "mainDirection">;
  readonly thumbs: (
    project: Project,
    from: string,
    to: string
  ) => Promise<VersionThumbs>;
  readonly versions: VersionStore;
}

interface VersionTarget {
  readonly direction: Direction;
  readonly project: Project;
}

type VersionReadError = KnownFailure;

const REQUIRED_KEYS = [
  "history",
  "names",
  "projects",
  "thumbs",
  "versions",
] as const;

const slot = makeRuntimeSlot<Partial<VersionReadRuntime>>("Version read");

const bindVersionReadRuntime = (part: Partial<VersionReadRuntime>): void => {
  slot.bind({ ...slot.peek(), ...part });
};

const isReady = (
  runtime: Partial<VersionReadRuntime> | null
): runtime is VersionReadRuntime =>
  runtime !== null && REQUIRED_KEYS.every((key) => key in runtime);

const readyOrNull = (
  runtime: Partial<VersionReadRuntime> | null
): VersionReadRuntime | null => {
  if (isReady(runtime)) {
    return runtime;
  }

  return null;
};

const attemptVersionRead = <Value>(
  task: (runtime: VersionReadRuntime) => Promise<Value>
): Effect.Effect<Value, VersionReadError> =>
  Effect.gen(function* withRuntime() {
    const found = slot.peek();
    const runtime = yield* requireBound("Version read", readyOrNull(found));

    return yield* attemptKnown(() => task(runtime));
  });

export { attemptVersionRead, bindVersionReadRuntime };

export type { VersionReadError, VersionReadRuntime, VersionTarget };
