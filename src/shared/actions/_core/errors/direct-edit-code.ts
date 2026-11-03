import { Schema } from "effect";

const DirectEditCodeSchema = Schema.Literals([
  "attribute_not_literal",
  "cannot_move",
  "cannot_restructure",
  "classes_not_editable",
  "element_not_found",
  "history_empty",
  "history_stale",
  "invalid_request",
  "invalid_source",
  "invalid_token",
  "invalid_tweak_value",
  "no_base_version",
  "no_change",
  "no_design_system",
  "no_tweaks",
  "not_host_element",
  "parse_failed",
  "run_in_progress",
  "source_not_found",
  "stale_selection",
  "style_not_literal",
  "text_from_data",
  "text_not_editable",
  "token_exists",
  "tokens_invalid",
  "tweak_not_declared",
  "unknown_token",
  "unknown_tweak",
  "variant_not_supported",
]);

type DirectEditCode = typeof DirectEditCodeSchema.Type;

const CONFLICT_CODES: readonly DirectEditCode[] = [
  "history_stale",
  "run_in_progress",
  "token_exists",
];

const NOT_FOUND_CODES: readonly DirectEditCode[] = [
  "no_design_system",
  "no_tweaks",
];

export { CONFLICT_CODES, DirectEditCodeSchema, NOT_FOUND_CODES };

export type { DirectEditCode };
