import { Schema } from "effect";

import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema, PublicationIdSchema } from "../_core/ids.js";
import { defineOp } from "../_core/op.js";
import { CfFailed } from "./errors/cf-failed.js";
import { PublicationSchema } from "./schema.js";

const unpublish = defineOp({
  access: "destructive",
  agent: {
    lean: false,
    name: "unpublish_design",
    set: "core",
    short: "Take one publication off the internet. The user must click Allow.",
  },
  confirm: "user",
  description:
    "Take a publication off the internet. The user must click Allow.",
  errors: [NotFound, CfFailed],
  http: {
    method: "DELETE",
    path: "/api/projects/:projectId/publications/:publicationId",
  },
  id: "publish.unpublish",
  input: Schema.Struct({
    projectId: ProjectIdSchema,
    publicationId: PublicationIdSchema,
  }),
  invalidates: ["publish.list"],
  mcp: { name: "unpublish_design" },
  needs: "project.publish",
  output: Schema.Struct({ publication: PublicationSchema }),
  scope: "project",
});

export { unpublish };
