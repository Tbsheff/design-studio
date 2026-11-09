import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { MockupExportFields, MockupExportResultSchema } from "./schema.js";

const exportMockup = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "export_mockup",
    set: "app",
    short:
      "Export a frame inside a device bezel (iPhone, Pixel, iPad, MacBook or browser) as a PNG. Changes no design file.",
  },
  confirm: "none",
  description:
    "Export one frame inside a device frame as a PNG mockup. Shoots the frame at the device screen size, draws a CSS bezel around it, and writes exports/mockups/<frame>-<device>-<scheme>.png in the Design Studio data folder. Returns the path and the size. Changes no design file.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/mockup/export" },
  id: "mockup.export",
  input: Schema.Struct({
    ...MockupExportFields,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["export.getHandoff"],
  mcp: { name: "export_mockup" },
  needs: "project.update",
  output: MockupExportResultSchema,
  scope: "project",
});

export { exportMockup };
