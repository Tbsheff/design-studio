import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { AttachmentSchema } from "./schema.js";

const createAttachmentProject = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "create_attachment_project",
    set: "core",
    short:
      "Save an attachment file in a project. The file bytes go in as base64. Returns the attachment.",
  },
  confirm: "none",
  description:
    "Save an attachment file in a project. The file bytes go in as base64. Returns the attachment.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/attachments" },
  id: "project.createAttachment",
  input: Schema.Struct({
    data: Schema.String,
    mime: Schema.String,
    name: Schema.String,
    projectId: ProjectIdSchema,
  }),
  invalidates: ["project.get"],
  mcp: { name: "create_attachment_project" },
  needs: "project.update",
  output: AttachmentSchema,
  scope: "project",
});

export { createAttachmentProject };
