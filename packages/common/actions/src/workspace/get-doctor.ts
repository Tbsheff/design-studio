import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { DoctorViewSchema } from "./schema.js";

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects.",
});

const FreshFieldSchema = Schema.Boolean.annotate({
  description:
    "Request the app root again before the check. Default false: use the last request.",
});

const getDoctorWorkspace = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "app_doctor",
    set: "app",
    short:
      "Read only. Diagnose why the attached app dev server or a route does not render.",
  },
  confirm: "none",
  description:
    "Read only. For an attached app: name the cause when the dev server fails or a frame shows an error overlay, with the same server code as the doctor card in the studio: env-validation (and the env key that skips it, such as SKIP_ENV_VALIDATION=true), missing-env-file, port-in-use, install (with the command) and auth-redirect. Each problem has a kind; pass it to apply_app_fix when it has a fix. Returns status, doctor and text, a plain summary. The doctor reads the dev server log of the current start and one request to the app root.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/app/doctor" },
  id: "workspace.getDoctor",
  input: Schema.Struct({
    fresh: Schema.optionalKey(FreshFieldSchema),
    projectId: ProjectFieldSchema,
  }),
  invalidates: [],
  mcp: { name: "app_doctor" },
  needs: "project.read",
  output: DoctorViewSchema,
  scope: "project",
});

export { getDoctorWorkspace };
