import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementTargetSchema } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  GridChangeSchema,
  GridItemChangeFields,
  GridTargetFields,
} from "./schema.js";

const setGridItemGrid = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_grid_item_grid",
    set: "core",
    short: "Set the column and row start and span of one child of a grid.",
  },
  confirm: "none",
  description:
    "Set where one child of a grid sits: colStart and colSpan for the columns, rowStart and rowSpan for the rows. Starts are line numbers from 1 and spans are counts from 1; null removes a value. The target is the child, not the grid. In a Tailwind page it writes classes such as col-span-2 and row-start-1. In a plain page it writes grid-column and grid-row declarations. breakpoint is base (default) or a breakpoint name. Saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/grid/item",
  },
  id: "grid.setGridItem",
  input: Schema.Struct({
    ...GridTargetFields,
    ...GridItemChangeFields,
    target: ElementTargetSchema,
  }),
  invalidates: ["grid.get"],
  mcp: { name: "set_grid_item_grid" },
  needs: "project.update",
  output: GridChangeSchema,
  scope: "project",
});

export { setGridItemGrid };
