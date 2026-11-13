import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  DirectionFieldSchema,
  KeepTokensSchema,
  LayerIdSchema,
  LayerScaleChangeSchema,
  ScaleFactorSchema,
} from "./schema.js";

const updateLayerStyle = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "update_layer_style",
    set: "tweak",
    short:
      "Scale one layer and its children by a factor: sizes, type, spacing, radius, borders and shadows, as one version.",
  },
  confirm: "none",
  description:
    "Scale one layer and its children by a factor from 0.25 to 4. Pass layerId as file:line:col or a layer id from get_layers. It scales fixed width and height, font size, absolute line height, letter spacing, padding, margin, gap, radius, border width and shadow lengths. On a Tailwind page each value snaps to the nearest scale class when one is within 1 px. On a plain CSS page it writes declarations. With shouldKeepTokens on, values that come from tokens stay. All changes save as one version and one undo step.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/layer-style/update" },
  id: "layer-style.update",
  input: Schema.Struct({
    directionId: DirectionFieldSchema,
    factor: ScaleFactorSchema,
    layerId: LayerIdSchema,
    projectId: ProjectIdSchema,
    shouldKeepTokens: KeepTokensSchema,
  }),
  invalidates: ["layer-style.get", "version.list", "canvas.getDoc"],
  mcp: { name: "update_layer_style" },
  needs: "project.update",
  output: LayerScaleChangeSchema,
  scope: "project",
});

export { updateLayerStyle };
