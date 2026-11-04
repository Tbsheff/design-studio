// @generated
import type { DirectEditActions } from "@design-studio/actions/direct-edit/index";
import type { Entries } from "../_core/handler.js";
import { handle as applyReviewFixDirectEditHandle } from "./apply-review-fix.js";
import { handle as applySwapDirectEditHandle } from "./apply-swap.js";
import { handle as applyDirectEditHandle } from "./apply.js";
import { handle as createComponentDirectEditHandle } from "./create-component.js";
import { handle as createTokenDirectEditHandle } from "./create-token.js";
import { handle as deleteTextDirectEditHandle } from "./delete-text.js";
import { handle as getComponentPreviewDirectEditHandle } from "./get-component-preview.js";
import { handle as getDesignSystemDirectEditHandle } from "./get-design-system.js";
import { handle as getPreviewDirectEditHandle } from "./get-preview.js";
import { handle as getReviewDirectEditHandle } from "./get-review.js";
import { handle as getRulesDirectEditHandle } from "./get-rules.js";
import { handle as getTreeDirectEditHandle } from "./get-tree.js";
import { handle as getTweaksDirectEditHandle } from "./get-tweaks.js";
import { handle as importFigmaDirectEditHandle } from "./import-figma.js";
import { handle as insertComponentDirectEditHandle } from "./insert-component.js";
import { handle as insertJsxDirectEditHandle } from "./insert-jsx.js";
import { handle as inspectPropsInstanceDirectEditHandle } from "./inspect-props-instance.js";
import { handle as inspectTokensDirectEditHandle } from "./inspect-tokens.js";
import { handle as listComponentFoldersDirectEditHandle } from "./list-component-folders.js";
import { handle as listComponentsDirectEditHandle } from "./list-components.js";
import { handle as listInsertableDirectEditHandle } from "./list-insertable.js";
import { handle as listPropsComponentsDirectEditHandle } from "./list-props-components.js";
import { handle as listSwapCandidatesDirectEditHandle } from "./list-swap-candidates.js";
import { handle as runReviewDirectEditHandle } from "./run-review.js";
import { handle as runRulesTestDirectEditHandle } from "./run-rules-test.js";
import { handle as runDirectEditHandle } from "./run.js";
import { handle as setImageDirectEditHandle } from "./set-image.js";
import { handle as setPropsDirectEditHandle } from "./set-props.js";
import { handle as setRulesDirectEditHandle } from "./set-rules.js";
import { handle as setVariantClassesDirectEditHandle } from "./set-variant-classes.js";
import { handle as setVectorDirectEditHandle } from "./set-vector.js";
import { handle as updateTokensDirectEditHandle } from "./update-tokens.js";
import { handle as updateTweaksDirectEditHandle } from "./update-tweaks.js";

const DirectEditEntries = {
  applyDirectEdit: { handle: applyDirectEditHandle },
  applyReviewFixDirectEdit: { handle: applyReviewFixDirectEditHandle },
  applySwapDirectEdit: { handle: applySwapDirectEditHandle },
  createComponentDirectEdit: { handle: createComponentDirectEditHandle },
  createTokenDirectEdit: { handle: createTokenDirectEditHandle },
  deleteTextDirectEdit: { handle: deleteTextDirectEditHandle },
  getComponentPreviewDirectEdit: {
    handle: getComponentPreviewDirectEditHandle,
  },
  getDesignSystemDirectEdit: { handle: getDesignSystemDirectEditHandle },
  getPreviewDirectEdit: { handle: getPreviewDirectEditHandle },
  getReviewDirectEdit: { handle: getReviewDirectEditHandle },
  getRulesDirectEdit: { handle: getRulesDirectEditHandle },
  getTreeDirectEdit: { handle: getTreeDirectEditHandle },
  getTweaksDirectEdit: { handle: getTweaksDirectEditHandle },
  importFigmaDirectEdit: { handle: importFigmaDirectEditHandle },
  insertComponentDirectEdit: { handle: insertComponentDirectEditHandle },
  insertJsxDirectEdit: { handle: insertJsxDirectEditHandle },
  inspectPropsInstanceDirectEdit: {
    handle: inspectPropsInstanceDirectEditHandle,
  },
  inspectTokensDirectEdit: { handle: inspectTokensDirectEditHandle },
  listComponentFoldersDirectEdit: {
    handle: listComponentFoldersDirectEditHandle,
  },
  listComponentsDirectEdit: { handle: listComponentsDirectEditHandle },
  listInsertableDirectEdit: { handle: listInsertableDirectEditHandle },
  listPropsComponentsDirectEdit: {
    handle: listPropsComponentsDirectEditHandle,
  },
  listSwapCandidatesDirectEdit: { handle: listSwapCandidatesDirectEditHandle },
  runDirectEdit: { handle: runDirectEditHandle },
  runReviewDirectEdit: { handle: runReviewDirectEditHandle },
  runRulesTestDirectEdit: { handle: runRulesTestDirectEditHandle },
  setImageDirectEdit: { handle: setImageDirectEditHandle },
  setPropsDirectEdit: { handle: setPropsDirectEditHandle },
  setRulesDirectEdit: { handle: setRulesDirectEditHandle },
  setVariantClassesDirectEdit: { handle: setVariantClassesDirectEditHandle },
  setVectorDirectEdit: { handle: setVectorDirectEditHandle },
  updateTokensDirectEdit: { handle: updateTokensDirectEditHandle },
  updateTweaksDirectEdit: { handle: updateTweaksDirectEditHandle },
} satisfies Entries<typeof DirectEditActions>;

export { DirectEditEntries };
