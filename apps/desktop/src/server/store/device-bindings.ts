import { randomBytes } from "node:crypto";
import path from "node:path";

import { Context, Effect, Layer, Ref, Semaphore } from "effect";

import { BindingsFileSchema } from "../../shared/cloud-contracts.js";
import type {
  BindingsFile,
  CloudRef,
  ProjectBinding,
} from "../../shared/cloud-contracts.js";
import { setPrivateJson } from "../platform/atomic-write/index.js";
import { loadConfig } from "../platform/config/index.js";
import { toFileStamp, toJsonFileReader } from "../platform/local-file/index.js";
import type { FileStamp } from "../platform/local-file/index.js";

interface BindingKey {
  readonly orgId: string;
  readonly projectId: string;
}

interface DeviceBindingsApi {
  readonly createLocalProjectId: (
    cloudKey: BindingKey
  ) => Effect.Effect<string>;
  readonly delete: (key: BindingKey) => Effect.Effect<void>;
  readonly get: (key: BindingKey) => Effect.Effect<ProjectBinding | null>;
  readonly getOrgOfProject: (projectId: string) => Effect.Effect<string | null>;
  readonly set: (
    projectId: string,
    binding: ProjectBinding
  ) => Effect.Effect<void>;
  readonly setCloudRef: (
    key: BindingKey,
    cloudRef: CloudRef
  ) => Effect.Effect<void>;
}

interface CachedFile {
  readonly stamp: FileStamp | null;
  readonly value: BindingsFile;
}

interface BindingsState {
  readonly cache: Ref.Ref<CachedFile | null>;
  readonly file: string;
  readonly lock: Semaphore.Semaphore;
}

const BINDINGS_FILE = "bindings.json";
const SUFFIX_BYTES = 4;
const MAX_PROJECT_ID_LENGTH = 64;
const BASE_PROJECT_ID_LENGTH = 40;

const readBindingsFile = toJsonFileReader(BindingsFileSchema);

const toEmptyFile = (): BindingsFile => ({
  bindings: {},
  projectIdMap: {},
  version: 1,
});

const toKeyText = (key: BindingKey): string => `${key.orgId}:${key.projectId}`;

const isSameStamp = (
  left: FileStamp | null,
  right: FileStamp | null
): boolean => {
  if (left === null || right === null) {
    return left === right;
  }

  return left.mtimeMs === right.mtimeMs && left.size === right.size;
};

const toOrgOfProject = (
  value: BindingsFile,
  projectId: string
): string | null => {
  for (const [keyText, binding] of Object.entries(value.bindings)) {
    if (keyText === toKeyText({ orgId: binding.orgId, projectId })) {
      return binding.orgId;
    }
  }

  return null;
};

const hasOtherOrgBinding = (
  value: BindingsFile,
  cloudKey: BindingKey
): boolean =>
  Object.entries(value.bindings).some(
    ([keyText, binding]) =>
      binding.orgId !== cloudKey.orgId &&
      keyText ===
        toKeyText({ orgId: binding.orgId, projectId: cloudKey.projectId })
  );

const toRekeyedProjectId = (cloudProjectId: string): string => {
  const suffix = randomBytes(SUFFIX_BYTES).toString("hex");
  const base = cloudProjectId.slice(0, BASE_PROJECT_ID_LENGTH);

  return `${base}-${suffix}`.slice(0, MAX_PROJECT_ID_LENGTH);
};

const toFileWithout = (value: BindingsFile, key: BindingKey): BindingsFile => {
  const keyText = toKeyText(key);

  if (!(keyText in value.bindings)) {
    return value;
  }

  return {
    ...value,
    bindings: Object.fromEntries(
      Object.entries(value.bindings).filter(([entry]) => entry !== keyText)
    ),
  };
};

const toFileWithCloudRef = (
  value: BindingsFile,
  key: BindingKey,
  cloudRef: CloudRef
): BindingsFile => {
  const keyText = toKeyText(key);
  const existing = value.bindings[keyText] ?? null;

  if (existing === null) {
    return value;
  }

  return {
    ...value,
    bindings: { ...value.bindings, [keyText]: { ...existing, cloudRef } },
  };
};

const getFile = Effect.fn("DeviceBindings.getFile")(function* run(
  state: BindingsState
) {
  const stamp = yield* toFileStamp(state.file);
  const cached = yield* Ref.get(state.cache);

  if (cached !== null && isSameStamp(cached.stamp, stamp)) {
    return cached.value;
  }

  const value = (yield* readBindingsFile(state.file)) ?? toEmptyFile();

  yield* Ref.set(state.cache, { stamp, value });

  return value;
});

const setFile = Effect.fn("DeviceBindings.setFile")(function* run(
  state: BindingsState,
  change: (value: BindingsFile) => BindingsFile
) {
  const current = yield* getFile(state);
  const next = change(current);

  if (next !== current) {
    yield* setPrivateJson(state.file, next);
    yield* Ref.set(state.cache, null);
  }

  return next;
});

const createLocalProjectId = Effect.fn("DeviceBindings.createLocalProjectId")(
  function* run(state: BindingsState, cloudKey: BindingKey) {
    const current = yield* getFile(state);
    const mapKey = toKeyText(cloudKey);
    const mapped = current.projectIdMap[mapKey] ?? null;

    if (mapped !== null) {
      return mapped;
    }

    if (!hasOtherOrgBinding(current, cloudKey)) {
      return cloudKey.projectId;
    }

    const localProjectId = toRekeyedProjectId(cloudKey.projectId);

    yield* setFile(state, (value) => ({
      ...value,
      projectIdMap: { ...value.projectIdMap, [mapKey]: localProjectId },
    }));

    return localProjectId;
  }
);

const toApi = (state: BindingsState): DeviceBindingsApi => {
  const exclusive = state.lock.withPermits(1);

  return {
    createLocalProjectId: (cloudKey) =>
      exclusive(createLocalProjectId(state, cloudKey)),
    delete: Effect.fn("DeviceBindings.delete")(function* run(key) {
      yield* exclusive(setFile(state, (value) => toFileWithout(value, key)));
    }),
    get: Effect.fn("DeviceBindings.get")(function* run(key) {
      const value = yield* getFile(state);

      return value.bindings[toKeyText(key)] ?? null;
    }),
    getOrgOfProject: Effect.fn("DeviceBindings.getOrgOfProject")(
      function* run(projectId) {
        return toOrgOfProject(yield* getFile(state), projectId);
      }
    ),
    set: Effect.fn("DeviceBindings.set")(function* run(projectId, binding) {
      const keyText = toKeyText({ orgId: binding.orgId, projectId });

      yield* exclusive(
        setFile(state, (value) => ({
          ...value,
          bindings: { ...value.bindings, [keyText]: binding },
        }))
      );
    }),
    setCloudRef: Effect.fn("DeviceBindings.setCloudRef")(
      function* run(key, cloudRef) {
        yield* exclusive(
          setFile(state, (value) => toFileWithCloudRef(value, key, cloudRef))
        );
      }
    ),
  };
};

class DeviceBindings extends Context.Service<
  DeviceBindings,
  DeviceBindingsApi
>()("design-studio/store/DeviceBindings") {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    DeviceBindings,
    Effect.gen(function* build() {
      const lock = yield* Semaphore.make(1);
      const cache = yield* Ref.make<CachedFile | null>(null);
      const file = path.join(loadConfig().dataDir, BINDINGS_FILE);

      return DeviceBindings.of(toApi({ cache, file, lock }));
    })
  );
}

export { DeviceBindings };

export type { BindingKey, DeviceBindingsApi };
