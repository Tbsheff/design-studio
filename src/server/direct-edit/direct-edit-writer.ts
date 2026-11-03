import { Context, Effect, Layer } from "effect";

import { attemptDirectEdit } from "./direct-edit-core.js";
import type { DirectEditFailure } from "./direct-edit-core.js";
import {
  applySwapIn,
  createComponentIn,
  deleteTextIn,
  insertComponentIn,
  insertJsxIn,
  setImageIn,
  setVectorIn,
} from "./direct-edit-insert-ops.js";
import {
  applyEditBody,
  commitTweaksIn,
  createTokenIn,
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
  readonly updateTokens: (
    ref: DirectionRef,
    body: EditBody
  ) => Effect.Effect<
    Awaited<ReturnType<typeof updateTokensIn>>,
    DirectEditFailure
  >;
  readonly insertComponent: (
    ref: DirectionRef,
    body: EditBody
  ) => Effect.Effect<
    Awaited<ReturnType<typeof insertComponentIn>>,
    DirectEditFailure
  >;
  readonly insertJsx: (
    ref: DirectionRef,
    body: EditBody
  ) => Effect.Effect<
    Awaited<ReturnType<typeof insertJsxIn>>,
    DirectEditFailure
  >;
  readonly deleteText: (
    ref: DirectionRef,
    body: EditBody
  ) => Effect.Effect<
    Awaited<ReturnType<typeof deleteTextIn>>,
    DirectEditFailure
  >;
  readonly setImage: (
    ref: DirectionRef,
    body: EditBody
  ) => Effect.Effect<Awaited<ReturnType<typeof setImageIn>>, DirectEditFailure>;
  readonly setVector: (
    ref: DirectionRef,
    body: EditBody
  ) => Effect.Effect<
    Awaited<ReturnType<typeof setVectorIn>>,
    DirectEditFailure
  >;
  readonly createComponent: (
    ref: DirectionRef,
    body: EditBody
  ) => Effect.Effect<
    Awaited<ReturnType<typeof createComponentIn>>,
    DirectEditFailure
  >;
  readonly applySwap: (
    ref: DirectionRef,
    body: EditBody
  ) => Effect.Effect<
    Awaited<ReturnType<typeof applySwapIn>>,
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
      applySwap: Effect.fn("DirectEditWriter.applySwap")(function* run(
        ref: DirectionRef,
        body: EditBody
      ) {
        return yield* attemptDirectEdit((runtime) =>
          applySwapIn(runtime, ref, body)
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
      createComponent: Effect.fn("DirectEditWriter.createComponent")(
        function* run(ref: DirectionRef, body: EditBody) {
          return yield* attemptDirectEdit((runtime) =>
            createComponentIn(runtime, ref, body)
          );
        }
      ),
      createToken: Effect.fn("DirectEditWriter.createToken")(function* run(
        ref: DirectionRef,
        body: EditBody
      ) {
        return yield* attemptDirectEdit((runtime) =>
          createTokenIn(runtime, ref, body)
        );
      }),
      deleteText: Effect.fn("DirectEditWriter.deleteText")(function* run(
        ref: DirectionRef,
        body: EditBody
      ) {
        return yield* attemptDirectEdit((runtime) =>
          deleteTextIn(runtime, ref, body)
        );
      }),
      insertComponent: Effect.fn("DirectEditWriter.insertComponent")(
        function* run(ref: DirectionRef, body: EditBody) {
          return yield* attemptDirectEdit((runtime) =>
            insertComponentIn(runtime, ref, body)
          );
        }
      ),
      insertJsx: Effect.fn("DirectEditWriter.insertJsx")(function* run(
        ref: DirectionRef,
        body: EditBody
      ) {
        return yield* attemptDirectEdit((runtime) =>
          insertJsxIn(runtime, ref, body)
        );
      }),
      setImage: Effect.fn("DirectEditWriter.setImage")(function* run(
        ref: DirectionRef,
        body: EditBody
      ) {
        return yield* attemptDirectEdit((runtime) =>
          setImageIn(runtime, ref, body)
        );
      }),
      setVector: Effect.fn("DirectEditWriter.setVector")(function* run(
        ref: DirectionRef,
        body: EditBody
      ) {
        return yield* attemptDirectEdit((runtime) =>
          setVectorIn(runtime, ref, body)
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
