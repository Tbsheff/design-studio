import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  DirectionIdSchema,
  ProjectIdSchema,
  VersionIdSchema,
} from "../_core/ids.js";
import {
  ExportFrameInputsSchema,
  ExportScaleSchema,
  FolderExportResultSchema,
  FolderPathSchema,
} from "./schema.js";

const DirectionFieldSchema = DirectionIdSchema.annotate({
  description: "Direction id. Leave out for the main direction.",
});

const FolderFieldSchema = FolderPathSchema.annotate({
  description:
    "Absolute path of an existing folder. Leave out for the Design Studio data folder (exports/<projectId>).",
});

const FormatFieldSchema = Schema.Literals([
  "png",
  "html",
  "pdf",
  "handoff",
  "zip",
]).annotate({
  description:
    "png, html, pdf, handoff (folder for a coding agent, as a zip) or zip (source files).",
});

const FramesFieldSchema = ExportFrameInputsSchema.annotate({
  description:
    "Frames to capture. Default one 1440x900 frame (handoff: desktop and mobile).",
});

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects.",
});

const ScaleFieldSchema = ExportScaleSchema.annotate({
  description: "PNG pixel scale.",
});

const VersionFieldSchema = VersionIdSchema.annotate({
  description: "Version id. Leave out for the newest version of the direction.",
});

const exportFolderExport = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "user",
  description:
    "Export a version as PNG, HTML, PDF, a handoff zip or a source zip and write the files to a folder. Returns the file paths. Default folder: the Design Studio data folder, exports/<projectId>. The user approves each export in Design Studio.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/export/files" },
  id: "export.exportFolder",
  input: Schema.Struct({
    directionId: Schema.optionalKey(DirectionFieldSchema),
    folder: Schema.optionalKey(FolderFieldSchema),
    format: FormatFieldSchema,
    frames: Schema.optionalKey(FramesFieldSchema),
    projectId: ProjectFieldSchema,
    scale: Schema.optionalKey(ScaleFieldSchema),
    versionId: Schema.optionalKey(VersionFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "export" },
  needs: "project.read",
  output: FolderExportResultSchema,
  scope: "project",
});

export { exportFolderExport };
