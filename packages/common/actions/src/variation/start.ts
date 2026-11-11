import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { VariationStartFields, VariationStartedSchema } from "./schema.js";

const startVariation = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "start_variation",
    set: "core",
    short:
      "Fork 1 to 4 directions from one prompt and start a run in each, to compare page variations side by side.",
  },
  confirm: "none",
  description:
    "Start N page variations of one design from one prompt. The studio writes count short briefs (or uses the briefs you give), forks one direction per brief from fromDirectionId (or an empty design), and starts one run in each. Returns the variation group id and, per variation, its direction id, run id and name.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/variations/start" },
  id: "variation.start",
  input: Schema.Struct({
    ...VariationStartFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["project.get", "run.list"],
  mcp: { name: "start_variation" },
  needs: "project.update",
  output: VariationStartedSchema,
  scope: "project",
});

export { startVariation };
