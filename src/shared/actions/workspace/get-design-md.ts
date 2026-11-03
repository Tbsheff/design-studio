import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { DesignMdSchema } from "./schema.js";

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects",
});

const VersionFieldSchema = Schema.String.annotate({
  description:
    "Version id. Leave out for the newest saved version of the main direction.",
});

const DirectionFieldSchema = DirectionIdSchema.annotate({
  description: "Direction id. Leave out for the main direction.",
});

const getDesignMdWorkspace = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Get the DESIGN.md rules of the project. Returns text, or a short note when the project has no DESIGN.md. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/design-md" },
  id: "workspace.getDesignMd",
  input: Schema.Struct({
    directionId: Schema.optionalKey(DirectionFieldSchema),
    projectId: ProjectFieldSchema,
    versionId: Schema.optionalKey(VersionFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "get_design_md" },
  needs: "project.read",
  output: DesignMdSchema,
  scope: "project",
});

export { getDesignMdWorkspace };
