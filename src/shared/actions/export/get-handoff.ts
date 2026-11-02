import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { ExportFileResultSchema } from "./schema.js";

const HANDOFF_FOLDER_MAX = 200;

const HandoffFolderSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(HANDOFF_FOLDER_MAX)
);

const getHandoffExport = defineAction({
  access: "read",
  agent: { off: "stream" },
  confirm: "none",
  description:
    "Read one handoff folder of a project as a zip file. Returns the zip as base64 content with its name and media type. Read only: changes no file.",
  errors: [BadRequest, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/handoff/:folder/zip",
  },
  id: "export.getHandoff",
  input: Schema.Struct({
    folder: HandoffFolderSchema,
    projectId: ProjectIdSchema,
  }),
  invalidates: [],
  mcp: { off: "stream" },
  needs: "project.read",
  output: ExportFileResultSchema,
  scope: "project",
});

export { getHandoffExport };
