import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { DataModelErrorTag } from "./index.js";

const DataModelStatus = {} as const satisfies Record<
  DataModelErrorTag,
  HttpStatus
>;

export { DataModelStatus };
