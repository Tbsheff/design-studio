import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { CfFailed } from "./errors/cf-failed.js";
import { PublicationResultSchema, PublicationTargetFields } from "./schema.js";

const unpublishPublish = defineAction({
  access: "destructive",
  agent: {
    lean: false,
    name: "unpublish_design",
    set: "app",
    short:
      "Turn off one publication so its URL answers 410. The user must click Allow first.",
  },
  confirm: "user",
  description:
    "Turn off a publication so its URL answers 410, and delete its files. The user must click Allow in Design Studio first. The publication stays in list_publications as removed.",
  errors: [BadRequest, CfFailed, Conflict, NotFound],
  http: {
    method: "DELETE",
    path: "/api/projects/:projectId/publications/:publicationId",
  },
  id: "publish.unpublish",
  input: Schema.Struct(PublicationTargetFields),
  invalidates: ["publish.list"],
  mcp: { name: "unpublish_design" },
  needs: "publication.delete",
  output: PublicationResultSchema,
  scope: "project",
});

export { unpublishPublish };
