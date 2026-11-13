export { isPathLocked } from "./engine/is-path-locked.js";

export {
  getFileLockState,
  getFileLocks,
  toCleanGlobs,
  toFileLockPath,
} from "./lock-file.js";

export type { FileLockState } from "./lock-file.js";

export {
  FILE_LOCKED_MESSAGE,
  runFileLockGuard,
  runWithWriteTarget,
  runWriteTargetGuard,
  toGuardedDirection,
} from "./write-guard.js";

export type { WithDirection, WriteTarget } from "./write-guard.js";
