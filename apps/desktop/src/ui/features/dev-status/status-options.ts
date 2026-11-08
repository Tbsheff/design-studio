import { copy } from "./copy.js";
import type { UiSelectOption } from "./deps.js";
import type { StatusValue } from "./dev-status-model.js";

const STATUS_OPTIONS: readonly UiSelectOption<StatusValue>[] = [
  { label: copy.statusDraft, value: "draft" },
  { label: copy.statusInReview, value: "in-review" },
  { label: copy.statusReady, value: "ready" },
  { label: copy.statusBuilt, value: "built" },
];

export { STATUS_OPTIONS };
