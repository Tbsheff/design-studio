import { ARRANGE_TOOLS } from "../arrange-tools.js";
import { COMPONENT_CREATE_TOOLS } from "../component-create-tools.js";
import { COMPONENT_PREVIEW_TOOLS } from "../component-preview-tools.js";
import { FIGMA_IMPORT_TOOLS } from "../figma-import-tools.js";
import { IMAGE_TOOLS } from "../image-tools.js";
import { INSERT_TOOLS } from "../insert-tools.js";
import { JSX_INSERT_TOOLS } from "../jsx-insert-tools.js";
import { LAYER_STATE_TOOLS } from "../layer-state-tools.js";
import { LAYER_TOOLS } from "../layer-tools.js";
import { MOVE_TOOLS } from "../move-tools.js";
import { PROPS_TOOLS } from "../props-tools.js";
import { REVIEW_TOOLS } from "../review-tools.js";
import { RULES_TOOLS } from "../rules-tools.js";
import { SELECT_TOOLS } from "../select-tools.js";
import { STYLE_TOOLS } from "../style-tools.js";
import { TWEAK_TOOLS } from "../tweak-tools.js";
import { VARIANT_TOOLS } from "../variant-tools.js";
import { VECTOR_TOOLS } from "../vector-tools.js";
import { DIRECT_EDIT_INLINE_TOOLS } from "./direct-edit-inline.js";
import { guardTools } from "./guard.js";

const DIRECT_EDIT_LEGACY_TOOLS_UNGUARDED = [
  ...DIRECT_EDIT_INLINE_TOOLS,
  ...VARIANT_TOOLS,
  ...PROPS_TOOLS,
  ...STYLE_TOOLS,
  ...REVIEW_TOOLS,
  ...INSERT_TOOLS,
  ...JSX_INSERT_TOOLS,
  ...LAYER_TOOLS,
  ...RULES_TOOLS,
  ...ARRANGE_TOOLS,
  ...COMPONENT_PREVIEW_TOOLS,
  ...COMPONENT_CREATE_TOOLS,
  ...SELECT_TOOLS,
  ...TWEAK_TOOLS,
  ...IMAGE_TOOLS,
  ...VECTOR_TOOLS,
  ...LAYER_STATE_TOOLS,
  ...MOVE_TOOLS,
  ...FIGMA_IMPORT_TOOLS,
];

const DIRECT_EDIT_LEGACY_TOOLS = guardTools(DIRECT_EDIT_LEGACY_TOOLS_UNGUARDED);

export { DIRECT_EDIT_LEGACY_TOOLS };
