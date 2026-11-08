import type {
  EditSessionEnd,
  Version,
  WorkTreeStatus,
} from "@design-studio/contracts";
import { Context, Effect, Layer } from "effect";

import type { HunkRevertResult } from "../../shared/hunk.js";
import type { EditStepResult } from "../events/index.js";
import {
  restoreWorkTreeOf,
  createKeptVersion,
  restoreHeadOf,
} from "./version-head-write.js";
import { attemptVersionWrite } from "./version-write-core.js";
import type { VersionWriteError } from "./version-write-core.js";
import {
  writeEndSession,
  writeRename,
  writeRestore,
  writeRevertHunk,
  writeStep,
} from "./version-write.js";
import type {
  DirectionRef,
  HunkRevertQuery,
  RenameQuery,
  Renamed,
  RestoreQuery,
  SessionEndQuery,
} from "./version-write.js";

interface VersionWriterApi {
  readonly discard: (
    query: DirectionRef
  ) => Effect.Effect<WorkTreeStatus, VersionWriteError>;
  readonly endSession: (
    query: SessionEndQuery
  ) => Effect.Effect<EditSessionEnd, VersionWriteError>;
  readonly keep: (
    query: DirectionRef
  ) => Effect.Effect<Version, VersionWriteError>;
  readonly rename: (
    query: RenameQuery
  ) => Effect.Effect<Renamed, VersionWriteError>;
  readonly restore: (
    query: RestoreQuery
  ) => Effect.Effect<Version, VersionWriteError>;
  readonly restoreHead: (
    query: DirectionRef
  ) => Effect.Effect<Version, VersionWriteError>;
  readonly revertHunk: (
    query: HunkRevertQuery
  ) => Effect.Effect<HunkRevertResult, VersionWriteError>;
  readonly step: (
    query: DirectionRef,
    kind: "redo" | "undo"
  ) => Effect.Effect<EditStepResult, VersionWriteError>;
}

class VersionWriter extends Context.Service<VersionWriter, VersionWriterApi>()(
  "design-studio/store/VersionWriter"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    VersionWriter,
    VersionWriter.of({
      discard: Effect.fn("VersionWriter.discard")(function* run(
        query: DirectionRef
      ) {
        return yield* attemptVersionWrite((runtime) =>
          restoreWorkTreeOf(runtime, query)
        );
      }),
      endSession: Effect.fn("VersionWriter.endSession")(function* run(
        query: SessionEndQuery
      ) {
        return yield* attemptVersionWrite((runtime) =>
          writeEndSession(runtime, query)
        );
      }),
      keep: Effect.fn("VersionWriter.keep")(function* run(query: DirectionRef) {
        return yield* attemptVersionWrite((runtime) =>
          createKeptVersion(runtime, query)
        );
      }),
      rename: Effect.fn("VersionWriter.rename")(function* run(
        query: RenameQuery
      ) {
        return yield* attemptVersionWrite((runtime) =>
          writeRename(runtime, query)
        );
      }),
      restore: Effect.fn("VersionWriter.restore")(function* run(
        query: RestoreQuery
      ) {
        return yield* attemptVersionWrite((runtime) =>
          writeRestore(runtime, query)
        );
      }),
      restoreHead: Effect.fn("VersionWriter.restoreHead")(function* run(
        query: DirectionRef
      ) {
        return yield* attemptVersionWrite((runtime) =>
          restoreHeadOf(runtime, query)
        );
      }),
      revertHunk: Effect.fn("VersionWriter.revertHunk")(function* run(
        query: HunkRevertQuery
      ) {
        return yield* attemptVersionWrite((runtime) =>
          writeRevertHunk(runtime, query)
        );
      }),
      step: Effect.fn("VersionWriter.step")(function* run(
        query: DirectionRef,
        kind: "redo" | "undo"
      ) {
        return yield* attemptVersionWrite((runtime) =>
          writeStep(runtime, query, kind)
        );
      }),
    })
  );
}

export { VersionWriter };

export type { VersionWriterApi };
