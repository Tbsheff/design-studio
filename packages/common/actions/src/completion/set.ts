import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { CompletionSettingsSchema } from "./schema.js";

const setCompletion = defineAction({
  access: "edit",
  agent: { off: "secret" },
  confirm: "none",
  description:
    "Turn Prototype AI on or off for a project and set the spend cap in USD, 0.1 to 50. Only the user turns on spend. Returns the saved settings.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "PUT",
    path: "/api/projects/:projectId/completions/settings",
  },
  id: "completion.set",
  input: Schema.Struct({
    ...CompletionSettingsSchema.fields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["completion.list"],
  mcp: { name: "set_completion" },
  needs: "project.update",
  output: CompletionSettingsSchema,
  scope: "project",
});

export { setCompletion };
