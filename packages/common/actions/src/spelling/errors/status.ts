import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { SpellingErrorTag } from "./index.js";

const SpellingStatus = {} as const satisfies Record<
  SpellingErrorTag,
  HttpStatus
>;

export { SpellingStatus };
