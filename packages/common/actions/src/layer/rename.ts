import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { Forbidden } from "../_core/errors/forbidden.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditConflict } from "../direct-edit/errors/direct-edit-conflict.js";
import { DirectEditFailed } from "../direct-edit/errors/direct-edit-failed.js";
import { DirectEditNotFound } from "../direct-edit/errors/direct-edit-not-found.js";
import { LayerRenameFields, LayerRenameResultSchema } from "./schema.js";

const renameLayer = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "rename_layer",
    set: "core",
    short:
      "Rename up to 50 layers in one version. Names are written as data-name.",
  },
  confirm: "none",
  description:
    "Rename up to 50 layers in one version. Each layer is a layer id from get_layers, a CSS selector or a source location file:line:col, with a new name. Layers that share one source location or have no source are skipped and listed in skipped. The name is written as data-name in the source. An empty or null name removes the name. Saves one version, so one undo restores all names.",
  errors: [
    Forbidden,
    BadRequest,
    Conflict,
    NotFound,
    DirectEditFailed,
    DirectEditConflict,
    DirectEditNotFound,
  ],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/layers/rename",
  },
  id: "layer.rename",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    ...LayerRenameFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["direct-edit.getTree", "version.list", "version.listHistory"],
  mcp: { name: "rename_layer" },
  needs: "project.update",
  output: LayerRenameResultSchema,
  scope: "project",
});

export { renameLayer };
