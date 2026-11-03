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
import { HunkRevertedSchema } from "./schema.js";

const FILE_MAX = 300;

const HUNK_MAX = 10_000;

const FileSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FILE_MAX)
).annotate({
  description:
    "Project-relative path of the file, as diff_versions returns it.",
});

const HunkRange = Schema.isBetween({ maximum: HUNK_MAX, minimum: 1 });

const HunkNumberSchema = Schema.Int.check(HunkRange).annotate({
  description:
    "Which change in the file to undo: 1 is the first @@ hunk of the file in diff_versions.",
});

const FromSchema = VersionIdSchema.annotate({
  description:
    "The older version of the diff. Leave out for the parent of versionId.",
});

const NullableFromSchema = Schema.NullOr(FromSchema);

const applyHunkVersion = defineAction({
  access: "edit",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Undo one change (one @@ hunk) of a saved version, the same as Undo this change in Compare > Code in the studio. It reverses only that hunk in the current file of the direction head and saves the result as one new version, which undo (Cmd+Z) can take back. Other changes in the file stay. When the hunk text is no longer in the file (it was undone or edited later), it changes nothing and says why. Use diff_versions first to see the hunks.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/d/:directionId/hunks/revert",
  },
  id: "version.applyHunk",
  input: Schema.Struct({
    directionId: DirectionIdSchema.annotate({
      description: "Direction id. Use the main direction id for the main one.",
    }),
    file: FileSchema,
    from: Schema.optionalKey(NullableFromSchema),
    hunk: HunkNumberSchema,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    versionId: VersionIdSchema.annotate({
      description:
        "The version that made the change, from list_versions. The hunk is from the diff of from and this version.",
    }),
  }),
  invalidates: [
    "version.get",
    "version.inspectDiff",
    "version.list",
    "version.listHistory",
    "version.listHunks",
  ],
  mcp: { name: "revert_hunk" },
  needs: "project.update",
  output: HunkRevertedSchema,
  scope: "project",
});

export { applyHunkVersion };
