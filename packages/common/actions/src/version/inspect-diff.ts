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
import { VersionChangesSchema } from "./schema.js";

const DirectionFieldSchema = DirectionIdSchema.annotate({
  description: "Direction id. Leave out for the main direction.",
});

const FromFieldSchema = VersionIdSchema.annotate({
  description: "The older version id, from list_versions.",
});

const ProjectFieldSchema = ProjectIdSchema.annotate({
  description: "Project id from list_projects",
});

const ThumbnailsFieldSchema = Schema.Boolean.annotate({
  description:
    "Render a screenshot of both versions and a changed-pixel mask, and return their file paths. Default true.",
});

const ToFieldSchema = VersionIdSchema.annotate({
  description:
    "The newer version id. Leave out for the head version of the direction.",
});

const inspectDiffVersion = defineAction({
  access: "read",
  agent: { off: "legacy-agent" },
  confirm: "none",
  description:
    "Compare two saved versions, the same as Compare in the studio Versions panel. Returns each changed file (path, oldPath for a rename, status added, removed, modified or renamed, additions, deletions, binary) with its unified git diff (cut at 64 KB a file, 512 KB in all, and 100 files; truncated says so). With thumbnails (default) it also returns thumbs: absolute PNG paths of a 1280x800 screenshot of each version, a mask PNG of the changed pixels and changedPct. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/versions/:from/changes",
  },
  id: "version.inspectDiff",
  input: Schema.Struct({
    directionId: Schema.optionalKey(DirectionFieldSchema),
    from: FromFieldSchema,
    projectId: ProjectFieldSchema,
    thumbnails: Schema.optionalKey(ThumbnailsFieldSchema),
    to: Schema.optionalKey(ToFieldSchema),
  }),
  invalidates: [],
  mcp: { name: "diff_versions" },
  needs: "project.read",
  output: VersionChangesSchema,
  scope: "project",
});

export { inspectDiffVersion };
