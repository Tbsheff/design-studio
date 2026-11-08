import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { FileListSchema } from "./schema.js";

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

const listFilesWorkspace = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_files",
    set: "core",
    short:
      "Read only. List the source files of a project, with paths for read_file.",
  },
  confirm: "none",
  description:
    "List the source files of a version. Returns versionId and files with path and bytes. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/source-files" },
  id: "workspace.listFiles",
  input: Schema.Struct({
    directionId: Schema.optionalKey(DirectionFieldSchema),
    projectId: ProjectFieldSchema,
    versionId: Schema.optionalKey(VersionFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "list_files" },
  needs: "project.read",
  output: FileListSchema,
  scope: "project",
});

export { listFilesWorkspace };
