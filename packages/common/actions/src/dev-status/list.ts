import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { DevStatusEntrySchema, StatusFilterFieldSchema } from "./schema.js";

const listDevStatus = defineAction({
  access: "read",
  agent: {
    lean: false,
    name: "list_dev_status",
    set: "core",
    short:
      "List frames with a dev status and whether each ready frame changed since it was marked. Reads only.",
  },
  confirm: "none",
  description:
    "List the dev status of frames in a project. Each entry shows the status, the note, the version and time of the mark, and isChangedSince, which is true when a stamped source file has a different content hash now. changedFiles names those files. Filter by status ready to get the frames that are ready to build, then build exactly those frames.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/dev-status" },
  id: "dev-status.list",
  input: Schema.Struct({
    ...PageFields,
    projectId: ProjectIdSchema,
    status: StatusFilterFieldSchema,
  }),
  invalidates: [],
  mcp: { name: "list_dev_status" },
  needs: "project.read",
  output: pageOf(DevStatusEntrySchema),
  scope: "project",
});

export { listDevStatus };
