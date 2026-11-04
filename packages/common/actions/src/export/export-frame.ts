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
  CopySelectorSchema,
  ExportScopeSchema,
  FrameExportResultSchema,
  FrameRefsSchema,
} from "./schema.js";

const AreaFieldSchema = ExportScopeSchema.annotate({
  description:
    "SVG only: frame (the visible frame) or page (the full page height).",
});

const DirectionFieldSchema = DirectionIdSchema.annotate({
  description: "Direction id. Leave out for the main direction.",
});

const FormatFieldSchema = Schema.Literals(["svg", "pptx"]).annotate({
  description: "svg: vector file. pptx: slide deck.",
});

const FramesFieldSchema = FrameRefsSchema.annotate({
  description:
    "Frame ids or @labels from canvas_list. Leave out for every visible frame of the direction.",
});

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects.",
});

const SelectorFieldSchema = CopySelectorSchema.annotate({
  description:
    "SVG only: a layer id from get_layers or a CSS selector; exports just that element of the first frame.",
});

const VersionFieldSchema = VersionIdSchema.annotate({
  description: "Version id. Leave out for the newest version of the direction.",
});

const exportFrameExport = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Export canvas frames as SVG or PPTX with the same server code as Export > SVG and Export > PPTX in the studio. SVG: one vector file per frame (a zip for several) with shapes, text and embedded images; selector exports one element. PPTX: one slide per frame (or per .slide or [data-slide] section) with native, editable text boxes, boxes, lines, SVG shapes and pictures, on a full-slide picture of the rest. Returns the path of the file in the Design Studio data folder. Changes no design file.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/export/frame" },
  id: "export.exportFrame",
  input: Schema.Struct({
    area: Schema.optionalKey(AreaFieldSchema),
    directionId: Schema.optionalKey(DirectionFieldSchema),
    format: FormatFieldSchema,
    frames: Schema.optionalKey(FramesFieldSchema),
    projectId: ProjectFieldSchema,
    selector: Schema.optionalKey(SelectorFieldSchema),
    versionId: Schema.optionalKey(VersionFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "export_frame" },
  needs: "project.read",
  output: FrameExportResultSchema,
  scope: "project",
});

export { exportFrameExport };
