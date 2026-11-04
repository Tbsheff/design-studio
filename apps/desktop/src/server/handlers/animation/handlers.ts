// @generated
import type { AnimationActions } from "@design-studio/actions/animation/index";

import type { Entries } from "../_core/handler.js";
import { handle as createAnimationHandle } from "./create.js";
import {
  handle as deleteAnimationHandle,
  preview as deleteAnimationPreview,
} from "./delete.js";
import { handle as exportAnimationHandle } from "./export.js";
import { handle as getAnimationHandle } from "./get.js";
import { handle as listAnimationHandle } from "./list.js";
import { handle as updateAnimationHandle } from "./update.js";

const AnimationEntries = {
  createAnimation: { handle: createAnimationHandle },
  deleteAnimation: {
    handle: deleteAnimationHandle,
    preview: deleteAnimationPreview,
  },
  exportAnimation: { handle: exportAnimationHandle },
  getAnimation: { handle: getAnimationHandle },
  listAnimation: { handle: listAnimationHandle },
  updateAnimation: { handle: updateAnimationHandle },
} satisfies Entries<typeof AnimationActions>;

export { AnimationEntries };
