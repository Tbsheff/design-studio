import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, VersionIdSchema } from "../_core/ids.js";
import {
  CopySelectorSchema,
  ExportFileResultSchema,
  ExportFramesSchema,
  ExportScaleSchema,
  ExportScopeSchema,
} from "./schema.js";

const FileFormatSchema = Schema.Literals([
  "png",
  "pdf",
  "html",
  "zip",
  "svg",
  "pptx",
]);

const SelectorFieldSchema = Schema.NullOr(CopySelectorSchema);

const exportExport = defineAction({
  access: "edit",
  agent: { off: "stream" },
  confirm: "none",
  description:
    "Export a saved version as a PNG, PDF, HTML, source zip, SVG or PPTX file with the same server code as the studio Export dialog. Returns the file as base64 content with its name, media type and a note. Changes no design file.",
  errors: [BadRequest, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/export" },
  id: "export.export",
  input: Schema.Struct({
    format: FileFormatSchema,
    frames: Schema.optionalKey(ExportFramesSchema),
    projectId: ProjectIdSchema,
    scale: Schema.optionalKey(ExportScaleSchema),
    scope: Schema.optionalKey(ExportScopeSchema),
    selector: Schema.optionalKey(SelectorFieldSchema),
    versionId: VersionIdSchema,
  }),
  invalidates: [],
  mcp: { off: "stream" },
  needs: "project.read",
  output: ExportFileResultSchema,
  scope: "project",
});

export { exportExport };
