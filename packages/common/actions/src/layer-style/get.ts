import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { PageFields } from "../_core/list-page.js";
import {
  DirectionFieldSchema,
  GetGroupsSchema,
  LayerIdSchema,
  LayerStyleSchema,
} from "./schema.js";

const getLayerStyle = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "get_layer_style",
    set: "core",
    short:
      "Read the style classes of one layer by group: fill, text, spacing, size, border, radius, effect, layout.",
  },
  confirm: "none",
  description:
    "Read the style of one layer split into groups: fill, text, spacing, size, border, radius, effect and layout. On a Tailwind page each group lists its classes. On a plain CSS page each group lists its declarations. Read only. Use the result with apply_layer_style to copy a style to other layers.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/layer-style" },
  id: "layer-style.get",
  input: Schema.Struct({
    directionId: DirectionFieldSchema,
    groups: GetGroupsSchema,
    layerId: LayerIdSchema,
    limit: PageFields.limit,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { name: "get_layer_style" },
  needs: "project.read",
  output: LayerStyleSchema,
  scope: "project",
});

export { getLayerStyle };
