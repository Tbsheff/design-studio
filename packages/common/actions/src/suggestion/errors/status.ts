import type { HttpStatus } from "../../_core/errors/http-status-codes.js";
import type { SuggestionErrorTag } from "./index.js";

const SuggestionStatus = {} as const satisfies Record<
  SuggestionErrorTag,
  HttpStatus
>;

export { SuggestionStatus };
