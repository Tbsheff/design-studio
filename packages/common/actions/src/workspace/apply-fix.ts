import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects.",
});

const KindFieldSchema = Schema.Literals([
  "env-validation",
  "missing-env-file",
  "port-in-use",
  "install",
  "auth-redirect",
]).annotate({ description: "Problem kind from app_doctor." });

const applyFixWorkspace = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "apply_app_fix",
    set: "app",
    short:
      "Apply the one-click fix of one app_doctor problem, then restart the dev server. Call app_doctor again after.",
  },
  confirm: "none",
  description:
    "Apply the one-click fix of one app_doctor problem, with the same server code as the fix button on the studio doctor card, then restart the dev server. The studio runs the doctor again and applies only the fix it computed. You cannot pass env values. Wait for the restart, then call app_doctor again.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/app/doctor/fix" },
  id: "workspace.applyFix",
  input: Schema.Struct({
    kind: KindFieldSchema,
    projectId: ProjectFieldSchema,
  }),
  invalidates: ["workspace.getDoctor"],
  mcp: { name: "apply_app_fix" },
  needs: "project.update",
  output: Schema.Struct({ applied: Schema.String, kind: KindFieldSchema }),
  scope: "project",
});

export { applyFixWorkspace };
