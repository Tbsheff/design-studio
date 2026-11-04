import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { CritiqueErrorTag } from "./index.js";

const CritiqueStatus = {} as const satisfies Record<
  CritiqueErrorTag,
  HttpStatus
>;

export { CritiqueStatus };
