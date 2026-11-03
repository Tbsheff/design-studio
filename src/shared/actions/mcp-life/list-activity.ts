import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { ProjectIdSchema } from "../_core/ids.js";
import { McpActivityListSchema } from "./schema.js";

const listActivityMcpLife = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "List the recent edits that MCP clients made in one project, newest last. Each entry names the tool, the client, a short summary and the version it made.",
  errors: [BadRequest, NotFound],
  http: { method: "GET", path: "/api/projects/:projectId/mcp/activity" },
  id: "mcp-life.listActivity",
  input: Schema.Struct({
    projectId: ProjectIdSchema.annotate({
      description: "Project id from list_projects",
    }),
  }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "studio.read",
  output: McpActivityListSchema,
  scope: "project",
});

export { listActivityMcpLife };
