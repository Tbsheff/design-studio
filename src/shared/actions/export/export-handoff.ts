import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, VersionIdSchema } from "../_core/ids.js";
import { ExportFramesSchema, HandoffFolderResultSchema } from "./schema.js";

const exportHandoffExport = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Write a handoff folder for a coding agent from a saved version: source files, frame pictures, inlined HTML, decisions and a HANDOFF.md prompt. Returns the folder path, the file list and the prompt. Changes no design file.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/handoff" },
  id: "export.exportHandoff",
  input: Schema.Struct({
    frames: Schema.optionalKey(ExportFramesSchema),
    projectId: ProjectIdSchema,
    versionId: VersionIdSchema,
  }),
  invalidates: [],
  mcp: { off: "legacy-mcp" },
  needs: "project.read",
  output: HandoffFolderResultSchema,
  scope: "project",
});

export { exportHandoffExport };
