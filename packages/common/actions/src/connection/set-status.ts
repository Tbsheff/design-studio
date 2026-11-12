import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { McpStatusSchema } from "./schema.js";

const setStatusConnection = defineAction({
  access: "edit",
  agent: { off: "secret" },
  confirm: "none",
  description:
    "Turn the MCP server on or off, turn Allow edits on or off, make a new token, or set the trusted folders. MCP callers can create a design system from a trusted folder without an approval card. Turning either off denies every open approval. The result holds the connect command with the new token.",
  errors: [BadRequest],
  http: { method: "POST", path: "/api/mcp" },
  id: "connection.setStatus",
  input: Schema.Struct({
    edits: Schema.optionalKey(Schema.Boolean),
    enabled: Schema.optionalKey(Schema.Boolean),
    rotate: Schema.optionalKey(Schema.Boolean),
    trustedFolders: Schema.optionalKey(Schema.Array(Schema.String)),
  }),
  invalidates: [
    "connection.getSetup",
    "connection.getStatus",
    "connection.listApprovals",
  ],
  mcp: { off: "secret" },
  needs: "policy.set",
  output: McpStatusSchema,
  scope: "org",
});

export { setStatusConnection };
