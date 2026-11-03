import { Context, Effect, Layer } from "effect";

import { attemptDirectEdit } from "./direct-edit-core.js";
import type { DirectEditFailure } from "./direct-edit-core.js";
import {
  getComponentPreviewOf,
  listComponentFoldersOf,
  listComponentsOf,
  listInsertableOf,
  listSwapCandidatesOf,
} from "./direct-edit-insert-ops.js";
import type { SourceUse } from "./direct-edit-insert-ops.js";
import {
  designSystemOf,
  previewTokenChanges,
  previewUrlOf,
  readTweaks,
  treeOf,
} from "./direct-edit-ops.js";
import type { DirectionRef, EditBody } from "./direct-edit-ops.js";

interface DirectEditStoreApi {
  readonly getDesignSystem: (
    ref: DirectionRef
  ) => Effect.Effect<
    Awaited<ReturnType<typeof designSystemOf>>,
    DirectEditFailure
  >;
  readonly getPreview: (
    ref: DirectionRef
  ) => Effect.Effect<{ url: string }, DirectEditFailure>;
  readonly getTree: (
    ref: DirectionRef
  ) => Effect.Effect<{ files: string[] }, DirectEditFailure>;
  readonly getTweaks: (
    ref: DirectionRef
  ) => Effect.Effect<Awaited<ReturnType<typeof readTweaks>>, DirectEditFailure>;
  readonly listInsertable: (
    ref: DirectionRef
  ) => Effect.Effect<
    Awaited<ReturnType<typeof listInsertableOf>>,
    DirectEditFailure
  >;
  readonly listComponents: (
    ref: DirectionRef
  ) => Effect.Effect<
    Awaited<ReturnType<typeof listComponentsOf>>,
    DirectEditFailure
  >;
  readonly listComponentFolders: (
    ref: DirectionRef
  ) => Effect.Effect<
    Awaited<ReturnType<typeof listComponentFoldersOf>>,
    DirectEditFailure
  >;
  readonly listSwapCandidates: (
    ref: DirectionRef,
    use: SourceUse
  ) => Effect.Effect<
    Awaited<ReturnType<typeof listSwapCandidatesOf>>,
    DirectEditFailure
  >;
  readonly previewTokens: (
    ref: DirectionRef,
    body: EditBody
  ) => Effect.Effect<
    Awaited<ReturnType<typeof previewTokenChanges>>,
    DirectEditFailure
  >;
  readonly getComponentPreview: (
    ref: DirectionRef,
    body: EditBody
  ) => Effect.Effect<
    Awaited<ReturnType<typeof getComponentPreviewOf>>,
    DirectEditFailure
  >;
}

class DirectEditStore extends Context.Service<
  DirectEditStore,
  DirectEditStoreApi
>()("design-studio/direct-edit/DirectEditStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    DirectEditStore,
    DirectEditStore.of({
      getComponentPreview: Effect.fn("DirectEditStore.getComponentPreview")(
        function* run(ref: DirectionRef, body: EditBody) {
          return yield* attemptDirectEdit((runtime) =>
            getComponentPreviewOf(runtime, ref, body)
          );
        }
      ),
      getDesignSystem: Effect.fn("DirectEditStore.getDesignSystem")(
        function* run(ref: DirectionRef) {
          return yield* attemptDirectEdit((runtime) =>
            designSystemOf(runtime, ref)
          );
        }
      ),
      getPreview: Effect.fn("DirectEditStore.getPreview")(function* run(
        ref: DirectionRef
      ) {
        return yield* attemptDirectEdit((runtime) =>
          previewUrlOf(runtime, ref)
        );
      }),
      getTree: Effect.fn("DirectEditStore.getTree")(function* run(
        ref: DirectionRef
      ) {
        return yield* attemptDirectEdit((runtime) => treeOf(runtime, ref));
      }),
      getTweaks: Effect.fn("DirectEditStore.getTweaks")(function* run(
        ref: DirectionRef
      ) {
        return yield* attemptDirectEdit((runtime) => readTweaks(runtime, ref));
      }),
      listComponentFolders: Effect.fn("DirectEditStore.listComponentFolders")(
        function* run(ref: DirectionRef) {
          return yield* attemptDirectEdit((runtime) =>
            listComponentFoldersOf(runtime, ref)
          );
        }
      ),
      listComponents: Effect.fn("DirectEditStore.listComponents")(function* run(
        ref: DirectionRef
      ) {
        return yield* attemptDirectEdit((runtime) =>
          listComponentsOf(runtime, ref)
        );
      }),
      listInsertable: Effect.fn("DirectEditStore.listInsertable")(function* run(
        ref: DirectionRef
      ) {
        return yield* attemptDirectEdit((runtime) =>
          listInsertableOf(runtime, ref)
        );
      }),
      listSwapCandidates: Effect.fn("DirectEditStore.listSwapCandidates")(
        function* run(ref: DirectionRef, use: SourceUse) {
          return yield* attemptDirectEdit((runtime) =>
            listSwapCandidatesOf(runtime, ref, use)
          );
        }
      ),
      previewTokens: Effect.fn("DirectEditStore.previewTokens")(function* run(
        ref: DirectionRef,
        body: EditBody
      ) {
        return yield* attemptDirectEdit((runtime) =>
          previewTokenChanges(runtime, ref, body)
        );
      }),
    })
  );
}

export { DirectEditStore };
