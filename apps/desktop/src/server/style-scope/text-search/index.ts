export { TextSearchError } from "./errors.js";

export { TextSearchStore } from "./text-search-store.js";

export { TextSearchWriter } from "./text-search-writer.js";

export { searchText } from "./search-text.js";

export {
  applyTextUpdate,
  planTextUpdate,
  resultOf,
  writeTextUpdate,
} from "./update-text.js";

export type { SearchTarget } from "./scope.js";

export type {
  InspectTextCommand,
  UpdateTextCommand,
} from "./text-search-run.js";

export type { TextSearchStoreApi } from "./text-search-store.js";

export type { TextSearchWriterApi } from "./text-search-writer.js";

export type { UpdateCommit, UpdateOutcome, UpdatePlan } from "./update-text.js";
