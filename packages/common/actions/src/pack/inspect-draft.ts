import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { DraftStatusSchema } from "./schema.js";

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Design system draft project id from create_design_system.",
});

const inspectDraftPack = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "design_system_status",
    set: "design-system",
    short:
      "Read a design system draft: the state of each source, the coverage grade and the design system check.",
  },
  confirm: "none",
  description:
    "Read a design system draft: each source (queued, reading, read, thin, blocked, failed, with a plain sentence), whether all sources are done, the coverage grade, and the design system check (passed or the problems). The save gate uses the same check.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/design-system-draft/status",
  },
  id: "pack.inspectDraft",
  input: Schema.Struct({
    projectId: ProjectFieldSchema,
  }),
  invalidates: [],
  mcp: { name: "design_system_status" },
  needs: "project.read",
  output: DraftStatusSchema,
  scope: "project",
});

export { inspectDraftPack };
