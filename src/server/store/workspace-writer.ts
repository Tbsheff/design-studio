import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import type { DefaultFolderStore } from "./default-folder.js";
import { attemptDefaultFolder, attemptWorkspace } from "./workspace-runtime.js";
import type { WorkspaceStore as LegacyWorkspaceStore } from "./workspaces.js";

interface WorkspaceWriterApi {
  readonly add: (
    ...args: Parameters<LegacyWorkspaceStore["add"]>
  ) => Effect.Effect<
    Awaited<ReturnType<LegacyWorkspaceStore["add"]>>,
    KnownFailure
  >;
  readonly rename: (
    ...args: Parameters<LegacyWorkspaceStore["rename"]>
  ) => Effect.Effect<
    Awaited<ReturnType<LegacyWorkspaceStore["rename"]>>,
    KnownFailure
  >;
  readonly remove: (
    ...args: Parameters<LegacyWorkspaceStore["remove"]>
  ) => Effect.Effect<
    Awaited<ReturnType<LegacyWorkspaceStore["remove"]>>,
    KnownFailure
  >;
  readonly ensureFolder: (
    ...args: Parameters<DefaultFolderStore["ensure"]>
  ) => Effect.Effect<string, KnownFailure>;
  readonly setFolder: (
    ...args: Parameters<DefaultFolderStore["set"]>
  ) => Effect.Effect<string, KnownFailure>;
  readonly dismissOnboarding: (
    ...args: Parameters<DefaultFolderStore["dismissOnboarding"]>
  ) => Effect.Effect<void, KnownFailure>;
}

class WorkspaceWriter extends Context.Service<
  WorkspaceWriter,
  WorkspaceWriterApi
>()("design-studio/store/WorkspaceWriter") {
  declare public readonly access: "write";

  public static readonly layer = Layer.succeed(
    WorkspaceWriter,
    WorkspaceWriter.of({
      add: Effect.fn("WorkspaceWriter.add")(function* run(
        ...args: Parameters<LegacyWorkspaceStore["add"]>
      ) {
        return yield* attemptWorkspace((store) => store.add(...args));
      }),
      rename: Effect.fn("WorkspaceWriter.rename")(function* run(
        ...args: Parameters<LegacyWorkspaceStore["rename"]>
      ) {
        return yield* attemptWorkspace((store) => store.rename(...args));
      }),
      remove: Effect.fn("WorkspaceWriter.remove")(function* run(
        ...args: Parameters<LegacyWorkspaceStore["remove"]>
      ) {
        return yield* attemptWorkspace((store) => store.remove(...args));
      }),
      ensureFolder: Effect.fn("WorkspaceWriter.ensureFolder")(function* run(
        ...args: Parameters<DefaultFolderStore["ensure"]>
      ) {
        return yield* attemptDefaultFolder((store) => store.ensure(...args));
      }),
      setFolder: Effect.fn("WorkspaceWriter.setFolder")(function* run(
        ...args: Parameters<DefaultFolderStore["set"]>
      ) {
        return yield* attemptDefaultFolder((store) => store.set(...args));
      }),
      dismissOnboarding: Effect.fn("WorkspaceWriter.dismissOnboarding")(
        function* run(
          ...args: Parameters<DefaultFolderStore["dismissOnboarding"]>
        ) {
          return yield* attemptDefaultFolder((store) =>
            store.dismissOnboarding(...args)
          );
        }
      ),
    })
  );
}

export { WorkspaceWriter };

export type { WorkspaceWriterApi };
