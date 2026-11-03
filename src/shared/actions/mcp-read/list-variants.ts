import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { VariantListSchema } from "./schema.js";

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects",
});

const listVariantsMcpRead = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    'List the element variants of a project ("Try variants" in the studio): group id, label, title, direction id, file and line range, and state (running, ready, unchanged, rejected with the reason, kept or discarded). Read only. Only the user starts variant runs, in the studio; keep_variant applies a ready one.',
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/variants" },
  id: "mcp-read.listVariants",
  input: Schema.Struct({
    projectId: ProjectFieldSchema,
  }),
  invalidates: [],
  mcp: { name: "list_variants" },
  needs: "project.read",
  output: VariantListSchema,
  scope: "project",
});

export { listVariantsMcpRead };
