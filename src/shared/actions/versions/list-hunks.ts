import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, VersionIdSchema } from "../_core/ids.js";
import { HunkListSchema } from "./schema.js";

const FILE_MAX = 300;

const FileSchema = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(FILE_MAX)
);

const listHunksVersions = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "List the changes (hunks) of one file between two saved versions, numbered from 1 as revert_hunk counts them. Each hunk has its header, start lines and signed lines. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/versions/:from/hunks",
  },
  id: "versions.listHunks",
  input: Schema.Struct({
    file: FileSchema.annotate({
      description:
        "Project-relative path of the file, as diff_versions returns it.",
    }),
    from: VersionIdSchema.annotate({
      description: "The older version id, from list_versions.",
    }),
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    to: VersionIdSchema.annotate({
      description: "The newer version id, from list_versions.",
    }),
  }),
  invalidates: [],
  mcp: { name: "list_hunks" },
  needs: "project.read",
  output: HunkListSchema,
  scope: "project",
});

export { listHunksVersions };
