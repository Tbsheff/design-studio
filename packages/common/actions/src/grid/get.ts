import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementSourceFields } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  GridBreakpointDefaultSchema,
  GridInfoSchema,
  GridItemLimitSchema,
  GridTargetFields,
} from "./schema.js";

const getGrid = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "get_grid",
    set: "core",
    short: "Read the grid tracks, gaps and child spans of one layer.",
  },
  confirm: "none",
  description:
    "Read the CSS grid of one layer: display, column and row tracks, column and row gap, and the column and row placement of each direct child. Each value tells its source: a Tailwind class such as grid-cols-3 or col-span-2, or a CSS declaration. breakpoint is base (default) or a breakpoint name. The limit caps the child list. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/d/:directionId/grid" },
  id: "grid.get",
  input: Schema.Struct({
    ...GridTargetFields,
    ...ElementSourceFields,
    breakpoint: GridBreakpointDefaultSchema,
    limit: GridItemLimitSchema,
  }),
  invalidates: [],
  mcp: { name: "get_grid" },
  needs: "project.read",
  output: GridInfoSchema,
  scope: "project",
});

export { getGrid };
