import { Context, Effect, Layer } from "effect";

import { attemptDirectEdit } from "./direct-edit-core.js";
import type { DirectEditFailure } from "./direct-edit-core.js";
import {
  applyEditBody,
  commitTweaksIn,
  createTokenIn,
  previewTokenChanges,
  renderCheckOf,
  updateTokensIn,
} from "./direct-edit-ops.js";
import type { DirectionRef, EditBody } from "./direct-edit-ops.js";

interface DirectEditWriterApi {
  readonly apply: (
    ref: DirectionRef,
    body: EditBody
  ) => Effect.Effect<
    Awaited<ReturnType<typeof applyEditBody>>,
    DirectEditFailure
  >;
  readonly check: (
    ref: DirectionRef
  ) => Effect.Effect<
    Awaited<ReturnType<typeof renderCheckOf>>,
    DirectEditFailure
  >;
  readonly commitTweaks: (
    ref: DirectionRef,
    body: EditBody
  ) => Effect.Effect<
    Awaited<ReturnType<typeof commitTweaksIn>>,
    DirectEditFailure
  >;
  readonly createToken: (
    ref: DirectionRef,
    body: EditBody
  ) => Effect.Effect<
    Awaited<ReturnType<typeof createTokenIn>>,
    DirectEditFailure
  >;
  readonly previewTokens: (
    ref: DirectionRef,
    body: EditBody
  ) => Effect.Effect<
    Awaited<ReturnType<typeof previewTokenChanges>>,
    DirectEditFailure
  >;
  readonly updateTokens: (
    ref: DirectionRef,
    body: EditBody
  ) => Effect.Effect<
    Awaited<ReturnType<typeof updateTokensIn>>,
    DirectEditFailure
  >;
}

class DirectEditWriter extends Context.Service<
  DirectEditWriter,
  DirectEditWriterApi
>()("design-studio/direct-edit/DirectEditWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    DirectEditWriter,
    DirectEditWriter.of({
      apply: Effect.fn("DirectEditWriter.apply")(function* run(
        ref: DirectionRef,
        body: EditBody
      ) {
        return yield* attemptDirectEdit((runtime) =>
          applyEditBody(runtime, ref, body)
        );
      }),
      check: Effect.fn("DirectEditWriter.check")(function* run(
        ref: DirectionRef
      ) {
        return yield* attemptDirectEdit((runtime) =>
          renderCheckOf(runtime, ref)
        );
      }),
      commitTweaks: Effect.fn("DirectEditWriter.commitTweaks")(function* run(
        ref: DirectionRef,
        body: EditBody
      ) {
        return yield* attemptDirectEdit((runtime) =>
          commitTweaksIn(runtime, ref, body)
        );
      }),
      createToken: Effect.fn("DirectEditWriter.createToken")(function* run(
        ref: DirectionRef,
        body: EditBody
      ) {
        return yield* attemptDirectEdit((runtime) =>
          createTokenIn(runtime, ref, body)
        );
      }),
      previewTokens: Effect.fn("DirectEditWriter.previewTokens")(function* run(
        ref: DirectionRef,
        body: EditBody
      ) {
        return yield* attemptDirectEdit((runtime) =>
          previewTokenChanges(runtime, ref, body)
        );
      }),
      updateTokens: Effect.fn("DirectEditWriter.updateTokens")(function* run(
        ref: DirectionRef,
        body: EditBody
      ) {
        return yield* attemptDirectEdit((runtime) =>
          updateTokensIn(runtime, ref, body)
        );
      }),
    })
  );
}

export { DirectEditWriter };
