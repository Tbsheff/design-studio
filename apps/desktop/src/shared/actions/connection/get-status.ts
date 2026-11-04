import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { McpStatusSchema } from "./schema.js";

const getStatusConnection = defineAction({
  access: "read",
  agent: { off: "secret" },
  confirm: "none",
  description:
    "Read the MCP server settings: whether it is on, whether Allow edits is on, whether it runs, its url and the connect command. The command shows a token placeholder, never the token.",
  errors: [BadRequest],
  http: { method: "GET", path: "/api/mcp" },
  id: "connection.getStatus",
  input: Schema.Struct({}),
  invalidates: [],
  mcp: { off: "secret" },
  needs: "studio.read",
  output: McpStatusSchema,
  scope: "org",
});

export { getStatusConnection };
