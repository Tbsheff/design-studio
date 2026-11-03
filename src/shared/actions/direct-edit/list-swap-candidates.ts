import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { DirectEditError } from "../_core/errors/direct-edit-error.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DirectEditNotFound } from "./errors/direct-edit-not-found.js";
import { SwapCandidateListSchema } from "./schema.js";

const listSwapCandidatesDirectEdit = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "List the library components that can replace the component used at a source location.",
  errors: [BadRequest, NotFound, DirectEditError, DirectEditNotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/components/swap-candidates",
  },
  id: "direct-edit.listSwapCandidates",
  input: Schema.Struct({
    directionId: DirectionIdSchema,
    projectId: ProjectIdSchema,
    use: Schema.Unknown,
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.update",
  output: SwapCandidateListSchema,
  scope: "project",
});

export { listSwapCandidatesDirectEdit };
