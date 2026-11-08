import { Context, Effect, Layer } from "effect";

import { attemptDirectEdit } from "../../direct-edit/index.js";
import type { DirectEditFailure } from "../../direct-edit/index.js";
import {
  getComponentPreviewOf,
  listComponentFoldersOf,
  listComponentsOf,
  listInsertableOf,
  listSwapCandidatesOf,
  getDesignSystemOf,
  getTokenChangesPreview,
  getPreviewUrlOf,
  getTweaksState,
  getTreeOf,
  listPropsComponentsOf,
  getPropsInstanceOf,
  getReviewOf,
  getRulesOf,
} from "./ops/index.js";
import type { SourceUse, DirectionRef, EditBody } from "./ops/index.js";

interface DirectEditStoreApi {
  readonly getDesignSystem: (
    ref: DirectionRef
  ) => Effect.Effect<
    Awaited<ReturnType<typeof getDesignSystemOf>>,
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
  ) => Effect.Effect<
    Awaited<ReturnType<typeof getTweaksState>>,
    DirectEditFailure
  >;
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
    Awaited<ReturnType<typeof getTokenChangesPreview>>,
    DirectEditFailure
  >;
  readonly getComponentPreview: (
    ref: DirectionRef,
    body: EditBody
  ) => Effect.Effect<
    Awaited<ReturnType<typeof getComponentPreviewOf>>,
    DirectEditFailure
  >;
  readonly inspectPropsInstance: (
    ref: DirectionRef,
    body: Parameters<typeof getPropsInstanceOf>[2]
  ) => Effect.Effect<
    Awaited<ReturnType<typeof getPropsInstanceOf>>,
    DirectEditFailure
  >;
  readonly listPropsComponents: (
    ref: DirectionRef,
    body: Parameters<typeof listPropsComponentsOf>[2]
  ) => Effect.Effect<
    Awaited<ReturnType<typeof listPropsComponentsOf>>,
    DirectEditFailure
  >;
  readonly getRules: (
    ref: DirectionRef
  ) => Effect.Effect<Awaited<ReturnType<typeof getRulesOf>>, DirectEditFailure>;
  readonly getReview: (
    ref: DirectionRef
  ) => Effect.Effect<
    Awaited<ReturnType<typeof getReviewOf>>,
    DirectEditFailure
  >;
}

class DirectEditStore extends Context.Service<
  DirectEditStore,
  DirectEditStoreApi
>()("design-studio/share/DirectEditStore") {
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
            getDesignSystemOf(runtime, ref)
          );
        }
      ),
      getPreview: Effect.fn("DirectEditStore.getPreview")(function* run(
        ref: DirectionRef
      ) {
        return yield* attemptDirectEdit((runtime) =>
          getPreviewUrlOf(runtime, ref)
        );
      }),
      getReview: Effect.fn("DirectEditStore.getReview")(function* run(
        ref: DirectionRef
      ) {
        return yield* attemptDirectEdit((runtime) => getReviewOf(runtime, ref));
      }),
      getRules: Effect.fn("DirectEditStore.getRules")(function* run(
        ref: DirectionRef
      ) {
        return yield* attemptDirectEdit((runtime) => getRulesOf(runtime, ref));
      }),
      getTree: Effect.fn("DirectEditStore.getTree")(function* run(
        ref: DirectionRef
      ) {
        return yield* attemptDirectEdit((runtime) => getTreeOf(runtime, ref));
      }),
      getTweaks: Effect.fn("DirectEditStore.getTweaks")(function* run(
        ref: DirectionRef
      ) {
        return yield* attemptDirectEdit((runtime) =>
          getTweaksState(runtime, ref)
        );
      }),
      inspectPropsInstance: Effect.fn("DirectEditStore.inspectPropsInstance")(
        function* run(
          ref: DirectionRef,
          body: Parameters<typeof getPropsInstanceOf>[2]
        ) {
          return yield* attemptDirectEdit((runtime) =>
            getPropsInstanceOf(runtime, ref, body)
          );
        }
      ),
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
      listPropsComponents: Effect.fn("DirectEditStore.listPropsComponents")(
        function* run(
          ref: DirectionRef,
          body: Parameters<typeof listPropsComponentsOf>[2]
        ) {
          return yield* attemptDirectEdit((runtime) =>
            listPropsComponentsOf(runtime, ref, body)
          );
        }
      ),
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
          getTokenChangesPreview(runtime, ref, body)
        );
      }),
    })
  );
}

export { DirectEditStore };
