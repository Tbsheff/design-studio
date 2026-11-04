export { TextSearchError } from "./errors.js";

export {
  SEARCH_TEXT_DESCRIPTION,
  toSearchQuery,
  toUpdateRequest,
  UPDATE_TEXT_DESCRIPTION,
} from "./input.js";

export { searchText } from "./search-text.js";

export {
  planTextUpdate,
  resultOf,
  updateText,
  writeTextUpdate,
} from "./update-text.js";

export type { SearchTarget } from "./scope.js";

export type { SearchTextInput, UpdateTextInput } from "./input.js";

export type { UpdateCommit, UpdateOutcome, UpdatePlan } from "./update-text.js";
