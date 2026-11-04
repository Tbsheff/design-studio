import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { CfFailed } from "./errors/cf-failed.js";
import {
  PublicationResultSchema,
  PublicationTargetFields,
  toIdField,
} from "./schema.js";

const restorePublish = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "rollback_publication",
    set: "app",
    short:
      "Make an older published version live again at the same URL. The user must click Allow first.",
  },
  confirm: "user",
  description:
    "Make an older published version live again at the same URL. Nothing uploads; the newer version stays for a later rollback. The user must click Allow in Design Studio first.",
  errors: [BadRequest, CfFailed, Conflict, NotFound],
  http: {
    method: "POST",
    path: "/api/projects/:projectId/publications/:publicationId/rollback",
  },
  id: "publish.restore",
  input: Schema.Struct({
    ...PublicationTargetFields,
    versionId: toIdField(
      "Published version id from list_publications versions[].id."
    ),
  }),
  invalidates: ["publish.list"],
  mcp: { name: "rollback_publication" },
  needs: "publication.update",
  output: PublicationResultSchema,
  scope: "project",
});

export { restorePublish };
