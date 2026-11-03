import { Effect } from "effect";

import { attemptKnown } from "../platform/attempt/index.js";
import type { KnownFailure } from "../platform/attempt/index.js";
import { makeRuntimeSlot } from "../platform/runtime-slot/index.js";
import type { DefaultFolderStore } from "./default-folder.js";
import type { WorkspaceStore as WorkspaceFolderStore } from "./workspaces.js";

const workspaceSlot = makeRuntimeSlot<WorkspaceFolderStore>("Workspace store");

const folderSlot = makeRuntimeSlot<DefaultFolderStore>("Default folder");

const bindWorkspaceRuntime = (
  dataDir: string,
  store: WorkspaceFolderStore
): void => {
  workspaceSlot.bindAt(dataDir, store);
};

const bindDefaultFolderRuntime = (
  dataDir: string,
  store: DefaultFolderStore
): void => {
  folderSlot.bindAt(dataDir, store);
};

const readWorkspaceRuntime = workspaceSlot.read;

const readDefaultFolderRuntime = folderSlot.read;

const attemptWorkspace = <Value>(
  task: (store: WorkspaceFolderStore) => Promise<Value>
): Effect.Effect<Value, KnownFailure> =>
  Effect.gen(function* withStore() {
    const store = yield* workspaceSlot.read;

    return yield* attemptKnown(() => task(store));
  });

const attemptDefaultFolder = <Value>(
  task: (store: DefaultFolderStore) => Promise<Value>
): Effect.Effect<Value, KnownFailure> =>
  Effect.gen(function* withStore() {
    const store = yield* folderSlot.read;

    return yield* attemptKnown(() => task(store));
  });

export {
  attemptDefaultFolder,
  attemptWorkspace,
  bindDefaultFolderRuntime,
  bindWorkspaceRuntime,
  readDefaultFolderRuntime,
  readWorkspaceRuntime,
};
