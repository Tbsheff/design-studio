import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import {
  FileContentSchema,
  FileSavedSchema,
  PathTextSchema,
} from "./schema.js";

const updateFileWorkspace = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "update_file_workspace",
    set: "core",
    short:
      "Replace the full text of one source file of a direction. Pass the hash from read_file as baseHash. One undo step.",
  },
  confirm: "none",
  description:
    "Replace the full text of one existing source file of a direction. Pass baseHash from read_file. The call fails with Conflict when the file changed on disk since that read. Paths in node_modules, .git or outside the direction fail. The save is one version, and undo takes it back.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "PUT",
    path: "/api/projects/:projectId/d/:directionId/source-file",
  },
  id: "workspace.updateFile",
  input: Schema.Struct({
    baseHash: Schema.String.annotate({
      description: "Hash that read_file returned for the text you edited.",
    }),
    content: FileContentSchema.annotate({
      description: "New full text of the file.",
    }),
    directionId: DirectionIdSchema.annotate({ description: "Direction id." }),
    path: PathTextSchema.annotate({ description: "File path from list_files" }),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: ["workspace.getFile", "workspace.listFiles", "version.list"],
  mcp: { name: "update_file_workspace" },
  needs: "studio.write",
  output: FileSavedSchema,
  scope: "project",
});

export { updateFileWorkspace };
