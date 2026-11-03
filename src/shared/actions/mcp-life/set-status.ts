import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { McpStatusSchema } from "./schema.js";

const setStatusMcpLife = defineAction({
  access: "edit",
  agent: { off: "secret" },
  confirm: "none",
  description:
    "Turn the MCP server on or off, turn Allow edits on or off, or make a new token. Turning either off denies every open approval. The result holds the connect command with the new token.",
  errors: [BadRequest],
  http: { method: "POST", path: "/api/mcp" },
  id: "mcp-life.setStatus",
  input: Schema.Struct({
    edits: Schema.optionalKey(Schema.Boolean),
    enabled: Schema.optionalKey(Schema.Boolean),
    rotate: Schema.optionalKey(Schema.Boolean),
  }),
  invalidates: ["mcp-life.getStatus", "mcp-life.listApprovals"],
  mcp: { off: "secret" },
  needs: "policy.set",
  output: McpStatusSchema,
  scope: "org",
});

export { setStatusMcpLife };
