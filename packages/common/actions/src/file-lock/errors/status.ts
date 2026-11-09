import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { FileLockErrorTag } from "./index.js";

const FileLockStatus = {} as const satisfies Record<
  FileLockErrorTag,
  HttpStatus
>;

export { FileLockStatus };
