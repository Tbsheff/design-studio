import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { EditHistoryViewSchema } from "./schema.js";

const LimitSchema = Schema.Int.annotate({
  description: "Entries per side, 1 to 50.",
});

const listHistoryVersion = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "List the recent edits that undo and redo would step through, newest first: label, version id and files. This is the same undo history as the studio window (Cmd+Z). The history lives in memory and clears when Design Studio restarts. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/edit-history/list",
  },
  id: "version.listHistory",
  input: Schema.Struct({
    directionId: DirectionIdSchema.annotate({
      description: "Direction id. Use the main direction id for the main one.",
    }),
    limit: Schema.optionalKey(LimitSchema),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: [],
  mcp: { name: "edit_history" },
  needs: "project.read",
  output: EditHistoryViewSchema,
  scope: "project",
});

export { listHistoryVersion };
