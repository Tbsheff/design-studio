import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { KitDriftAppliedSchema, KitDriftApplyFields } from "./schema.js";

const applyKitDrift = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "apply_kit_drift",
    set: "kit",
    short:
      "Swap raw button, input and textarea elements for the kit component, as one undoable version. Takes ids from list_kit_drift.",
  },
  confirm: "none",
  description:
    "Swap raw HTML elements for the kit component that list_kit_drift found. Takes 1 to 20 find ids. It keeps onClick, type, disabled, name, value, placeholder, aria and data props, ref and children, moves the layout classes to className, sets variant and size when they match, and adds the import once per file. Saves one version and one undo step. Skips spread props, dynamic tags and kit files.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/kit-drift/apply" },
  id: "kit-drift.apply",
  input: Schema.Struct({
    ...KitDriftApplyFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["kit-drift.list", "direct-edit.getTree", "version.list"],
  mcp: { name: "apply_kit_drift" },
  needs: "project.update",
  output: KitDriftAppliedSchema,
  scope: "project",
});

export { applyKitDrift };
