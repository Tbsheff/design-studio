import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PublicationResultSchema, PublishInputSchema } from "./schema.js";

const publishPublish = defineAction({
  access: "edit",
  agent: {
    lean: false,
    name: "publish_design",
    set: "app",
    short:
      "Publish a saved version of a design to a public URL. The user must click Allow first.",
  },
  confirm: "user",
  description:
    "Publish a saved version to a public URL on the user's publish Worker, or republish into an old one (publicationId) as a new version. It first builds the exact files and hashes them, then the user must click Allow in Design Studio on a prompt that shows the pages, file count, size, URL, password and end date. Returns the publication with its URL. An attached app or React project goes up as PNG images of its frames, never its code.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/projects/:projectId/publish" },
  id: "publish.publish",
  input: PublishInputSchema,
  invalidates: ["publish.list"],
  mcp: { name: "publish_design" },
  needs: "project.publish",
  output: PublicationResultSchema,
  scope: "project",
});

export { publishPublish };
