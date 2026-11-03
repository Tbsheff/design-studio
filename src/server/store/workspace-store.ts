import { Context, Effect, Layer } from "effect";

import type { KnownFailure } from "../platform/attempt/index.js";
import type { DefaultFolderStore } from "./default-folder.js";
import { attemptDefaultFolder, attemptWorkspace } from "./workspace-runtime.js";
import type { WorkspaceStore as LegacyWorkspaceStore } from "./workspaces.js";

interface WorkspaceStoreApi {
  readonly list: (
    ...args: Parameters<LegacyWorkspaceStore["list"]>
  ) => Effect.Effect<
    Awaited<ReturnType<LegacyWorkspaceStore["list"]>>,
    KnownFailure
  >;
  readonly currentFolder: (
    ...args: Parameters<DefaultFolderStore["current"]>
  ) => Effect.Effect<string, KnownFailure>;
  readonly isOnboardingDismissed: (
    ...args: Parameters<DefaultFolderStore["onboardingDismissed"]>
  ) => Effect.Effect<boolean, KnownFailure>;
}

class WorkspaceStore extends Context.Service<
  WorkspaceStore,
  WorkspaceStoreApi
>()("design-studio/store/WorkspaceStore") {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    WorkspaceStore,
    WorkspaceStore.of({
      currentFolder: Effect.fn("WorkspaceStore.currentFolder")(function* run(
        ...args: Parameters<DefaultFolderStore["current"]>
      ) {
        return yield* attemptDefaultFolder((store) => store.current(...args));
      }),
      isOnboardingDismissed: Effect.fn("WorkspaceStore.isOnboardingDismissed")(
        function* run(
          ...args: Parameters<DefaultFolderStore["onboardingDismissed"]>
        ) {
          return yield* attemptDefaultFolder((store) =>
            store.onboardingDismissed(...args)
          );
        }
      ),
      list: Effect.fn("WorkspaceStore.list")(function* run(
        ...args: Parameters<LegacyWorkspaceStore["list"]>
      ) {
        return yield* attemptWorkspace((store) => store.list(...args));
      }),
    })
  );
}

export { WorkspaceStore };

export type { WorkspaceStoreApi };
