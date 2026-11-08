import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { Unavailable } from "../_core/errors/unavailable.js";
import { ProjectIdSchema } from "../_core/ids.js";
import {
  CompletionResultSchema,
  FrameFieldSchema,
  MaxTokensFieldSchema,
  PromptFieldSchema,
  SystemFieldSchema,
} from "./schema.js";

const createCompletion = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "create_completion",
    set: "core",
    short:
      "Call the model once with a prompt and return its text. Needs Prototype AI on in Settings. Logs each call.",
  },
  confirm: "none",
  description:
    "Run one live model completion for a project. The project must have Prototype AI on in Settings, Keys, and must have cap left. Returns the text, the cost in USD, the model, the time in ms and the log id. Prototype pages call this with window.studio.complete.",
  errors: [BadRequest, Conflict, NotFound, Unavailable],
  http: { method: "POST", path: "/api/projects/:projectId/completions" },
  id: "completion.create",
  input: Schema.Struct({
    frame: FrameFieldSchema,
    maxTokens: MaxTokensFieldSchema,
    projectId: ProjectIdSchema,
    prompt: PromptFieldSchema,
    system: SystemFieldSchema,
  }),
  invalidates: ["completion.list"],
  mcp: { name: "create_completion" },
  needs: "project.update",
  output: CompletionResultSchema,
  scope: "project",
});

export { createCompletion };
