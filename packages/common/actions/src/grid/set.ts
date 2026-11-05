import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ElementTargetSchema } from "../_core/element-target.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  GridChangeFields,
  GridChangeSchema,
  GridTargetFields,
} from "./schema.js";

const setGrid = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "set_grid",
    set: "core",
    short: "Set grid columns and rows on one layer, or turn it into a grid.",
  },
  confirm: "none",
  description:
    "Set the CSS grid of one layer in one version. columns and rows take a track list such as 1fr 2fr, 200px 1fr, repeat(3, minmax(0, 1fr)) or auto; null removes the tracks. display grid turns a flex or block layer into a grid. In a Tailwind page it writes classes such as grid, grid-cols-3 and grid-cols-[1fr_2fr]. In a plain page it writes CSS declarations. breakpoint is base (default) or a breakpoint name, so md writes md:grid-cols-3. Saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/grid",
  },
  id: "grid.set",
  input: Schema.Struct({
    ...GridTargetFields,
    ...GridChangeFields,
    target: ElementTargetSchema,
  }),
  invalidates: ["grid.get"],
  mcp: { name: "set_grid" },
  needs: "project.update",
  output: GridChangeSchema,
  scope: "project",
});

export { setGrid };
