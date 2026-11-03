import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { DirectionIdSchema, ProjectIdSchema } from "../_core/ids.js";
import { EditStepSchema } from "./schema.js";

const applyHistoryVersions = defineAction({
  access: "edit",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Redo the newest undone edit in the direction's edit history. This is the same undo history as the studio window (Cmd+Z), so the user and you share it. It holds direct edits, structure ops, batches, token and tweak edits, write_file changes to existing files, finished studio runs and version restores that changed text files, and prototype link and canvas frame changes, in the order they were made. For anything else (a new file, a design system apply) use restore_version. A new edit clears the redo list.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/edit-history/redo",
  },
  id: "versions.applyHistory",
  input: Schema.Struct({
    directionId: DirectionIdSchema.annotate({
      description: "Direction id. Use the main direction id for the main one.",
    }),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: [
    "versions.get",
    "versions.inspectDiff",
    "versions.list",
    "versions.listHistory",
    "versions.listHunks",
  ],
  mcp: { name: "redo" },
  needs: "project.update",
  output: EditStepSchema,
  scope: "project",
});

export { applyHistoryVersions };
