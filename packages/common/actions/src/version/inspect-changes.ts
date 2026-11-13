import { Effect, Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  DirectionIdSchema,
  ProjectIdSchema,
  VersionIdSchema,
} from "../_core/ids.js";
import { ChangedLayersSchema } from "./changes/schema.js";

const FromFieldSchema = Schema.NullOr(VersionIdSchema)
  .annotate({
    description:
      "The older version id, from list_versions. Leave out for the parent of to.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const ToFieldSchema = Schema.NullOr(VersionIdSchema)
  .annotate({
    description:
      "The newer version id, from list_versions. Leave out for the head version of the direction.",
  })
  .pipe(Schema.withDecodingDefaultKey(Effect.succeed(null)));

const inspectChangesVersion = defineAction({
  access: "read",
  agent: {
    lean: true,
    name: "inspect_changes_version",
    set: "core",
    short:
      "List the layers that changed between two versions, with kind, layer id and file line, to check your own edit.",
  },
  confirm: "none",
  description:
    "List the layers (elements) that changed between two saved versions of a direction, the same as the change rings on the studio canvas. Each item has the layer id (its data-studio-loc file:line:col), the file, the line, the kind (added, text, style or removed) and the hunk number that revert_hunk takes. Leave out from for the parent of to, and to for the head. Read only.",
  errors: [BadRequest, Conflict, NotFound],
  http: {
    method: "GET",
    path: "/api/projects/:projectId/d/:directionId/changes",
  },
  id: "version.inspectChanges",
  input: Schema.Struct({
    directionId: DirectionIdSchema.annotate({
      description: "Direction id. Use the main direction id for the main one.",
    }),
    from: FromFieldSchema,
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
    to: ToFieldSchema,
  }),
  invalidates: [],
  mcp: { name: "inspect_changes_version" },
  needs: "project.read",
  output: ChangedLayersSchema,
  scope: "project",
});

export { inspectChangesVersion };
