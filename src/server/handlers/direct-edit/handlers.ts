// @generated
import type { DirectEditActions } from "../../../shared/actions/direct-edit/index.js";
import type { Entries } from "../_core/handler.js";
import { handle as applyDirectEditHandle } from "./apply.js";
import { handle as createTokenDirectEditHandle } from "./create-token.js";
import { handle as getDesignSystemDirectEditHandle } from "./get-design-system.js";
import { handle as getPreviewDirectEditHandle } from "./get-preview.js";
import { handle as getTreeDirectEditHandle } from "./get-tree.js";
import { handle as getTweaksDirectEditHandle } from "./get-tweaks.js";
import { handle as inspectTokensDirectEditHandle } from "./inspect-tokens.js";
import { handle as runDirectEditHandle } from "./run.js";
import { handle as updateTokensDirectEditHandle } from "./update-tokens.js";
import { handle as updateTweaksDirectEditHandle } from "./update-tweaks.js";

const DirectEditEntries = {
  applyDirectEdit: { handle: applyDirectEditHandle },
  createTokenDirectEdit: { handle: createTokenDirectEditHandle },
  getDesignSystemDirectEdit: { handle: getDesignSystemDirectEditHandle },
  getPreviewDirectEdit: { handle: getPreviewDirectEditHandle },
  getTreeDirectEdit: { handle: getTreeDirectEditHandle },
  getTweaksDirectEdit: { handle: getTweaksDirectEditHandle },
  inspectTokensDirectEdit: { handle: inspectTokensDirectEditHandle },
  runDirectEdit: { handle: runDirectEditHandle },
  updateTokensDirectEdit: { handle: updateTokensDirectEditHandle },
  updateTweaksDirectEdit: { handle: updateTweaksDirectEditHandle },
} satisfies Entries<typeof DirectEditActions>;

export { DirectEditEntries };
