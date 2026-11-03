import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { RunContextSchema } from "./schema.js";

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects.",
});

const DirectionFieldSchema = DirectionIdSchema.annotate({
  description: "Direction id. Leave out for the main direction.",
});

const getRunContextWorkspace = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Read the repo context that every studio run of this direction gets: the AGENTS.md, CLAUDE.md, DESIGN.md and PRODUCT.md of the app folder and the workspace root, cut to about 32 KB in total, with lines that look like secrets left out. Returns workspaceRoot, appDir, files (path, scope app or workspace, bytes, sentBytes, use: full, cut, design_md (the project DESIGN.md, sent as its own block), duplicate, import_only or too_large) and text, the exact <repo_context> block of the run message. Only attached apps have repo context. Read only; it does not start a run.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/run-context" },
  id: "workspace.getRunContext",
  input: Schema.Struct({
    directionId: Schema.optionalKey(DirectionFieldSchema),
    projectId: ProjectFieldSchema,
  }),
  invalidates: [],
  mcp: { name: "get_run_context" },
  needs: "project.read",
  output: RunContextSchema,
  scope: "project",
});

export { getRunContextWorkspace };
