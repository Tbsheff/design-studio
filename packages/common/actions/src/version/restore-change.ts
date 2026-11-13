import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { Forbidden } from "../_core/errors/forbidden.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  DirectionIdSchema,
  ProjectIdSchema,
  VersionIdSchema,
} from "../_core/ids.js";
import { ChangeKindSchema, RestoredChangeSchema } from "./changes/schema.js";

const TEXT_MAX = 300;

const FileSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(TEXT_MAX)
).annotate({
  description:
    "Project-relative path of the file, from inspect_changes_version.",
});

const LayerIdSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(TEXT_MAX)
).annotate({
  description:
    "The layer id (file:line:col) of the changed layer, from inspect_changes_version.",
});

const restoreChangeVersion = defineAction({
  access: "edit",
  agent: {
    lean: true,
    name: "restore_change_version",
    set: "core",
    short:
      "Undo one changed layer from a version, as listed by inspect_changes_version, and keep the other changes.",
  },
  confirm: "none",
  description:
    "Undo one changed layer (element) of a saved version and keep the other changes of that version, the same as Undo this change on the studio change pill. Give the layer id, file and kind from inspect_changes_version. A style change puts back the old start tag, a text change puts back the old content, an added layer is removed and a removed layer is put back. It saves one new version, which undo (Cmd+Z) can take back. When the layer changed again after that version, it fails with Conflict; use revert_hunk then.",
  errors: [Forbidden, BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/changes/restore",
  },
  id: "version.restoreChange",
  input: Schema.Struct({
    directionId: DirectionIdSchema.annotate({
      description: "Direction id. Use the main direction id for the main one.",
    }),
    file: FileSchema,
    kind: ChangeKindSchema.annotate({
      description:
        "The kind of the change (added, text, style or removed), from inspect_changes_version.",
    }),
    layerId: LayerIdSchema,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    versionId: VersionIdSchema.annotate({
      description:
        "The version that made the change: the to version of inspect_changes_version.",
    }),
  }),
  invalidates: ["version.list", "version.inspectChanges", "canvas.getDoc"],
  mcp: { name: "restore_change_version" },
  needs: "project.update",
  output: RestoredChangeSchema,
  scope: "project",
});

export { restoreChangeVersion };
