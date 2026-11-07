import { createKeyedMutex } from "../platform/mutex/index.js";
import { createCliSession } from "./session.js";
import type { CliSession } from "./session.js";
import { createPublishBackend } from "./setup.js";
import type { PublishBackend } from "./setup.js";
import { createPublishStore } from "./store.js";
import type { PublishStore as PublishFiles } from "./store.js";
import { createKeyVault } from "./vault.js";

interface PublishCore {
  readonly backend: PublishBackend;
  readonly cli: CliSession;
  readonly files: PublishFiles;
  readonly lock: ReturnType<typeof createKeyedMutex>;
  readonly secrets: Set<string>;
}

const cores = new Map<string, PublishCore>();

const toPublishCore = (dataDir: string): PublishCore => {
  const found = cores.get(dataDir);

  if (found) {
    return found;
  }

  const files = createPublishStore(dataDir);
  const cli = createCliSession(files);

  const backend = createPublishBackend(
    files,
    cli,
    createKeyVault(files.dir, "publish-key")
  );

  const core: PublishCore = {
    backend,
    cli,
    files,
    lock: createKeyedMutex(),
    secrets: new Set<string>(),
  };

  cores.set(dataDir, core);

  return core;
};

export { toPublishCore };

export type { PublishCore };
