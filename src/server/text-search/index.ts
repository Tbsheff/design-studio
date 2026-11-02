export { TextSearchError } from "./errors.js";

export {
  SEARCH_TEXT_DESCRIPTION,
  searchTextFields,
  toSearchQuery,
  toUpdateRequest,
  UPDATE_TEXT_DESCRIPTION,
  updateTextFields,
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
