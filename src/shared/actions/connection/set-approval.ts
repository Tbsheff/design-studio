import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { NotFound } from "../_core/errors/not-found.js";
import { McpApprovalAnsweredSchema, McpApprovalIdSchema } from "./schema.js";

const setApprovalConnection = defineAction({
  access: "edit",
  agent: { off: "run-control" },
  confirm: "none",
  description:
    "Set the answer to one open approval request from an MCP client: allow or deny. Only the user answers, in the studio window, and the loopback guard keeps other callers out.",
  errors: [NotFound],
  http: { method: "POST", path: "/api/mcp/approvals/:approvalId" },
  id: "connection.setApproval",
  input: Schema.Struct({
    allow: Schema.Boolean,
    approvalId: McpApprovalIdSchema,
  }),
  invalidates: ["connection.listApprovals"],
  mcp: { off: "run-control" },
  needs: "policy.set",
  output: McpApprovalAnsweredSchema,
  scope: "org",
});

export { setApprovalConnection };
