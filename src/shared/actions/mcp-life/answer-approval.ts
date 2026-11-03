import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { McpApprovalAnsweredSchema, McpApprovalIdSchema } from "./schema.js";

const answerApprovalMcpLife = defineAction({
  access: "edit",
  agent: { off: "run-control" },
  confirm: "user",
  description:
    "Allow or deny one open approval request from an MCP client. Only the user can answer, in the studio window.",
  errors: [BadRequest, NotFound],
  http: { method: "POST", path: "/api/mcp/approvals/:id" },
  id: "mcp-life.answerApproval",
  input: Schema.Struct({
    allow: Schema.Boolean,
    id: McpApprovalIdSchema,
  }),
  invalidates: ["mcp-life.listApprovals"],
  mcp: { off: "run-control" },
  needs: "policy.set",
  output: McpApprovalAnsweredSchema,
  scope: "org",
});

export { answerApprovalMcpLife };
