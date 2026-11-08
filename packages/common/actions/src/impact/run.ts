import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { ImpactResultSchema, ImpactRunFields } from "./schema.js";

const runImpact = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "run_impact",
    set: "app",
    short:
      "Check other pages after a shared edit. Save a baseline of every route that uses a file, then compare after the edit.",
  },
  confirm: "none",
  description:
    "Check the other pages that use one shared file, such as a component, before and after an edit. Pass phase baseline to shoot each route that uses the file and keep the pictures. Make the edit. Pass phase compare to shoot the same routes again. Each route gets the share of changed pixels and a diff picture. Routes that do not use the file do not show up. It writes no project file. Read the last result with get_impact.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/impact/run" },
  id: "impact.run",
  input: Schema.Struct({
    ...ImpactRunFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["impact.get"],
  mcp: { name: "run_impact" },
  needs: "project.update",
  output: ImpactResultSchema,
  scope: "project",
});

export { runImpact };
