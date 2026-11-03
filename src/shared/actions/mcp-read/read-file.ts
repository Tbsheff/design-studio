import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { FileTextSchema, PathTextSchema } from "./schema.js";

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

const PathFieldSchema = PathTextSchema.annotate({
  description: "File path from list_files",
});

const readFileMcpRead = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Read one text source file of a version. Returns path and text. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/source-file" },
  id: "mcp-read.readFile",
  input: Schema.Struct({
    directionId: Schema.optionalKey(DirectionFieldSchema),
    path: PathFieldSchema,
    projectId: ProjectFieldSchema,
    versionId: Schema.optionalKey(VersionFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "read_file" },
  needs: "project.read",
  output: FileTextSchema,
  scope: "project",
});

export { readFileMcpRead };
