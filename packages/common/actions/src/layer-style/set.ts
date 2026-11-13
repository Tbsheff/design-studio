import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  DirectionFieldSchema,
  LayerIdSchema,
  LayerLayoutChangeSchema,
  LayoutGapSchema,
  LayoutKindSchema,
  LayoutPaddingSchema,
} from "./schema.js";

const setLayerStyle = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "set_layer_style",
    set: "tweak",
    short:
      "Turn a layer into an auto layout: its children line up in a row or column in their visual order, with padding so they keep their place, as one version.",
  },
  confirm: "none",
  description:
    "Turn one layer into an auto layout, as Shift+A does. Pass layerId as file:line:col or a layer id from get_layers. Layout auto picks a row when the children spread more on x than on y. It sorts the children by their place, moves absolute ones in the source into that order and removes their position and inset. The gap is the median space between neighbours, or the px or token you pass. Padding auto sets the parent padding from the space around the children, so they keep their place. Padding null keeps it. One version, one undo step.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/layer-style/set" },
  id: "layer-style.set",
  input: Schema.Struct({
    directionId: DirectionFieldSchema,
    gap: LayoutGapSchema,
    layerId: LayerIdSchema,
    layout: LayoutKindSchema,
    padding: LayoutPaddingSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["layer-style.get", "version.list", "canvas.getDoc"],
  mcp: { name: "set_layer_style" },
  needs: "project.update",
  output: LayerLayoutChangeSchema,
  scope: "project",
});

export { setLayerStyle };
