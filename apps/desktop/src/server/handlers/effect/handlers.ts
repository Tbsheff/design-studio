// @generated
import type { EffectActions } from "@design-studio/actions/effect/index";

import type { Entries } from "../_core/handler.js";
import { handle as createEffectHandle } from "./create.js";
import {
  handle as deleteEffectHandle,
  preview as deleteEffectPreview,
} from "./delete.js";
import { handle as getEffectHandle } from "./get.js";
import { handle as listEffectHandle } from "./list.js";
import { handle as setEffectHandle } from "./set.js";

const EffectEntries = {
  createEffect: { handle: createEffectHandle },
  deleteEffect: { handle: deleteEffectHandle, preview: deleteEffectPreview },
  getEffect: { handle: getEffectHandle },
  listEffect: { handle: listEffectHandle },
  setEffect: { handle: setEffectHandle },
} satisfies Entries<typeof EffectActions>;

export { EffectEntries };
