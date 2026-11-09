import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { Unavailable } from "../_core/errors/unavailable.js";
import {
  DirectionIdSchema,
  ProjectIdSchema,
  RunIdSchema,
} from "../_core/ids.js";
import { SuggestionResultSchema } from "./schema.js";

const runSuggestion = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "run_suggestion",
    set: "core",
    short:
      "Suggest 3 next prompts after a finished run. Reads the run, its files, the DESIGN.md and open review findings. Writes nothing.",
  },
  confirm: "none",
  description:
    "Suggest 3 next prompts of 80 chars or less after a finished run. Reads the run prompt, final message, changed files, frame route, project DESIGN.md and open review findings. Each prompt has a kind: refine, state, responsive or review. Writes nothing.",
  errors: [BadRequest, Conflict, NotFound, Unavailable],
  http: { method: "POST", path: "/api/projects/:projectId/suggestions" },
  id: "suggestion.run",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
    runId: RunIdSchema,
  }),
  invalidates: ["suggestion.run"],
  mcp: { name: "run_suggestion" },
  needs: "studio.write",
  output: SuggestionResultSchema,
  scope: "project",
});

export { runSuggestion };
