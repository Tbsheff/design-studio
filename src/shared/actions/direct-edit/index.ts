import { applySwapDirectEdit } from "./apply-swap.js";
// @generated
import { applyDirectEdit } from "./apply.js";
import { createComponentDirectEdit } from "./create-component.js";
import { createTokenDirectEdit } from "./create-token.js";
import { deleteTextDirectEdit } from "./delete-text.js";
import { getComponentPreviewDirectEdit } from "./get-component-preview.js";
import { getDesignSystemDirectEdit } from "./get-design-system.js";
import { getPreviewDirectEdit } from "./get-preview.js";
import { getTreeDirectEdit } from "./get-tree.js";
import { getTweaksDirectEdit } from "./get-tweaks.js";
import { insertComponentDirectEdit } from "./insert-component.js";
import { insertJsxDirectEdit } from "./insert-jsx.js";
import { inspectTokensDirectEdit } from "./inspect-tokens.js";
import { listComponentFoldersDirectEdit } from "./list-component-folders.js";
import { listComponentsDirectEdit } from "./list-components.js";
import { listInsertableDirectEdit } from "./list-insertable.js";
import { listSwapCandidatesDirectEdit } from "./list-swap-candidates.js";
import { runDirectEdit } from "./run.js";
import { setImageDirectEdit } from "./set-image.js";
import { setVectorDirectEdit } from "./set-vector.js";
import { updateTokensDirectEdit } from "./update-tokens.js";
import { updateTweaksDirectEdit } from "./update-tweaks.js";

const DirectEditActions = {
  applyDirectEdit,
  applySwapDirectEdit,
  createComponentDirectEdit,
  createTokenDirectEdit,
  deleteTextDirectEdit,
  getComponentPreviewDirectEdit,
  getDesignSystemDirectEdit,
  getPreviewDirectEdit,
  getTreeDirectEdit,
  getTweaksDirectEdit,
  insertComponentDirectEdit,
  insertJsxDirectEdit,
  inspectTokensDirectEdit,
  listComponentFoldersDirectEdit,
  listComponentsDirectEdit,
  listInsertableDirectEdit,
  listSwapCandidatesDirectEdit,
  runDirectEdit,
  setImageDirectEdit,
  setVectorDirectEdit,
  updateTokensDirectEdit,
  updateTweaksDirectEdit,
} as const;

export { DirectEditActions };
