import { writeAtomic } from "../platform/atomic-write/index.js";
import { assertSafeId } from "../platform/errors/index.js";
import { createKeyedMutex } from "../platform/mutex/index.js";
import {
  getFileLockState,
  toCleanGlobs,
  toFileLockPath,
} from "../platform/path-lock/index.js";

const mutex = createKeyedMutex();

const setFileLocks = (
  projectDir: string,
  directionId: string,
  globs: readonly string[]
): Promise<string[]> =>
  mutex(projectDir, async (): Promise<string[]> => {
    const did = assertSafeId(directionId, "directionId");
    const file = toFileLockPath(projectDir);
    const state = await getFileLockState(file);
    const clean = toCleanGlobs(globs);
    const kept = Object.entries(state.locks).filter(([key]) => key !== did);
    const own: [string, string[]][] = [];

    if (clean.length > 0) {
      own.push([did, clean]);
    }

    const locks = Object.fromEntries([...kept, ...own]);

    await writeAtomic(file, `${JSON.stringify({ locks }, null, 2)}\n`, {
      cleanup: "always",
      createDir: true,
    });

    return clean;
  });

export { setFileLocks };
