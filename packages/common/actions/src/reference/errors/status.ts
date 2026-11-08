import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { ReferenceDomainErrorTag } from "./index.js";

const ReferenceStatus = {} as const satisfies Record<
  ReferenceDomainErrorTag,
  HttpStatus
>;

export { ReferenceStatus };
