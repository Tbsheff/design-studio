// @generated
import type { GridActions } from "@design-studio/actions/grid/index";

import type { Entries } from "../_core/handler.js";
import { handle as getGridHandle } from "./get.js";
import { handle as setGridItemGridHandle } from "./set-grid-item.js";
import { handle as setGridHandle } from "./set.js";

const GridEntries = {
  getGrid: { handle: getGridHandle },
  setGrid: { handle: setGridHandle },
  setGridItemGrid: { handle: setGridItemGridHandle },
} satisfies Entries<typeof GridActions>;

export { GridEntries };
