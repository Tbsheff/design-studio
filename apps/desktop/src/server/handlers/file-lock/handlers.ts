// @generated
import type { FileLockActions } from "@design-studio/actions/file-lock/index";

import type { Entries } from "../_core/handler.js";
import { handle as getFileLockHandle } from "./get.js";
import { handle as setFileLockHandle } from "./set.js";

const FileLockEntries = {
  getFileLock: { handle: getFileLockHandle },
  setFileLock: { handle: setFileLockHandle },
} satisfies Entries<typeof FileLockActions>;

export { FileLockEntries };
