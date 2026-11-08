// @generated
import type { PropActions } from "@design-studio/actions/prop/index";

import type { Entries } from "../_core/handler.js";
import { handle as createPropHandle } from "./create.js";
import {
  handle as deletePropHandle,
  preview as deletePropPreview,
} from "./delete.js";
import { handle as listPropHandle } from "./list.js";
import { handle as renamePropHandle } from "./rename.js";
import { handle as setPropHandle } from "./set.js";

const PropEntries = {
  createProp: { handle: createPropHandle },
  deleteProp: { handle: deletePropHandle, preview: deletePropPreview },
  listProp: { handle: listPropHandle },
  renameProp: { handle: renamePropHandle },
  setProp: { handle: setPropHandle },
} satisfies Entries<typeof PropActions>;

export { PropEntries };
