import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { McpApprovalPollSchema } from "./schema.js";

const listApprovalsConnection = defineAction({
  access: "read",
  agent: { off: "stream" },
  confirm: "none",
  description:
    "List the open approval requests from MCP clients. Pass seen with the ids you know and wait in seconds (25 at most) to hold the call until the list changes.",
  errors: [BadRequest],
  http: { method: "GET", path: "/api/mcp/approvals" },
  id: "connection.listApprovals",
  input: Schema.Struct({
    seen: Schema.optionalKey(Schema.String),
    wait: Schema.optionalKey(Schema.Int),
  }),
  invalidates: [],
  mcp: { off: "stream" },
  needs: "studio.read",
  output: McpApprovalPollSchema,
  scope: "org",
});

export { listApprovalsConnection };
