import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { McpSetupSchema } from "./schema.js";

const getSetupConnection = defineAction({
  access: "read",
  agent: { off: "secret" },
  confirm: "none",
  description:
    "Read the setup for MCP clients: the server name, the url, the token, and whether the server is on, runs and allows edits. The UI builds the connect snippet for each client from it. Only the app reads it, because it holds the token.",
  errors: [BadRequest],
  http: { method: "GET", path: "/api/mcp/setup" },
  id: "connection.getSetup",
  input: Schema.Struct({}),
  invalidates: [],
  mcp: { off: "secret" },
  needs: "policy.set",
  output: McpSetupSchema,
  scope: "org",
});

export { getSetupConnection };
