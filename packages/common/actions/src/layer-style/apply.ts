import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  ApplyGroupsSchema,
  DirectionFieldSchema,
  LayerIdSchema,
  LayerStyleChangeSchema,
  TargetLayerIdsSchema,
} from "./schema.js";

const applyLayerStyle = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "apply_layer_style",
    set: "core",
    short:
      "Copy the style groups of one layer to other layers in one version. Margins and size stay unless you pick them.",
  },
  confirm: "none",
  description:
    "Copy style groups from one source layer to 1 to 50 target layers. Each target loses the classes of the chosen groups and gets the source classes of those groups. State and breakpoint prefixes such as hover: and md: stay with their group. Default groups are fill, text, spacing, border, radius and effect. Layout and size stay unless you pick them. On a plain CSS page it writes declarations. A target that comes from data or from a shared component is skipped with a reason. All targets save as one version and one undo step.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/layer-style/apply" },
  id: "layer-style.apply",
  input: Schema.Struct({
    directionId: DirectionFieldSchema,
    groups: ApplyGroupsSchema,
    projectId: ProjectIdSchema,
    sourceLayerId: LayerIdSchema,
    targetLayerIds: TargetLayerIdsSchema,
  }),
  invalidates: ["layer-style.get", "direct-edit.getTree"],
  mcp: { name: "apply_layer_style" },
  needs: "project.update",
  output: LayerStyleChangeSchema,
  scope: "project",
});

export { applyLayerStyle };
