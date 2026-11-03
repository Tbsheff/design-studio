// @generated
import { applyDirectEdit } from "./apply.js";
import { createTokenDirectEdit } from "./create-token.js";
import { getDesignSystemDirectEdit } from "./get-design-system.js";
import { getPreviewDirectEdit } from "./get-preview.js";
import { getTreeDirectEdit } from "./get-tree.js";
import { getTweaksDirectEdit } from "./get-tweaks.js";
import { inspectTokensDirectEdit } from "./inspect-tokens.js";
import { runDirectEdit } from "./run.js";
import { updateTokensDirectEdit } from "./update-tokens.js";
import { updateTweaksDirectEdit } from "./update-tweaks.js";

const DirectEditActions = {
  applyDirectEdit,
  createTokenDirectEdit,
  getDesignSystemDirectEdit,
  getPreviewDirectEdit,
  getTreeDirectEdit,
  getTweaksDirectEdit,
  inspectTokensDirectEdit,
  runDirectEdit,
  updateTokensDirectEdit,
  updateTweaksDirectEdit,
} as const;

export { DirectEditActions };
