import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { IntegrationIdFields, IntegrationSchema } from "./schema.js";

const runIntegration = defineAction({
  access: "edit",
  agent: { off: "secret" },
  confirm: "none",
  description:
    "Connect once to one saved outside MCP server. Saves its tool list and its status. A failed connect is a status error and not a failed action. This is a POST because it starts a process or a network call. Not an MCP tool or an agent tool, because the server holds credentials.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/integration/:integrationId/run" },
  id: "integration.run",
  input: Schema.Struct({
    ...IntegrationIdFields,
  }),
  invalidates: ["integration.list"],
  mcp: { off: "secret" },
  needs: "studio.write",
  output: IntegrationSchema,
  scope: "device",
});

export { runIntegration };
