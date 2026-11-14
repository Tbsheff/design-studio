import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { StyleVariantSchema } from "../_core/style-variant.js";
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
    "Copy style groups from one source layer to 1 to 50 target layers. Each target loses the classes of the chosen groups and gets the source classes of those groups. Default groups are fill, text, spacing, border, radius and effect. On a plain CSS page it writes declarations. variant is a state or breakpoint prefix such as hover:, md:hover: or data-[state=open]:, and the default is the base style. With a variant, the base classes of the source get the prefix and only classes with that prefix go. Targets from data or a shared component are skipped. Saves one version.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/layer-style/apply" },
  id: "layer-style.apply",
  input: Schema.Struct({
    directionId: DirectionFieldSchema,
    groups: ApplyGroupsSchema,
    projectId: ProjectIdSchema,
    sourceLayerId: LayerIdSchema,
    targetLayerIds: TargetLayerIdsSchema,
    variant: StyleVariantSchema,
  }),
  invalidates: ["layer-style.get", "direct-edit.getTree"],
  mcp: { name: "apply_layer_style" },
  needs: "project.update",
  output: LayerStyleChangeSchema,
  scope: "project",
});

export { applyLayerStyle };
