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
} from "./schema.js";

const setLayerStyle = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "set_layer_style",
    set: "tweak",
    short:
      "Turn a layer into an auto layout: its loose children line up in a row or a column in their visual order, as one version.",
  },
  confirm: "none",
  description:
    "Turn one layer into an auto layout, as Shift+A does in the inspector. Pass layerId as file:line:col or a layer id from get_layers. It reads the boxes of the children on the page. With layout auto, it picks a row when the children spread more on x than on y, and a column when not. It sorts absolute children by their place, moves them in the source into that order, and removes position, top, right, bottom and left from them. The gap is the median space between neighbours, or the gap you pass as px or a token. Children that are not absolute keep their order and styles. All changes save as one version and one undo step.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/layer-style/set" },
  id: "layer-style.set",
  input: Schema.Struct({
    directionId: DirectionFieldSchema,
    gap: LayoutGapSchema,
    layerId: LayerIdSchema,
    layout: LayoutKindSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["layer-style.get", "version.list", "canvas.getDoc"],
  mcp: { name: "set_layer_style" },
  needs: "project.update",
  output: LayerLayoutChangeSchema,
  scope: "project",
});

export { setLayerStyle };
