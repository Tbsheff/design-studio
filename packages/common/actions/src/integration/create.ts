import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { IntegrationCreateFields, IntegrationSchema } from "./schema.js";

const createIntegration = defineAction({
  access: "edit",
  agent: { off: "secret" },
  confirm: "none",
  description:
    "Save one outside MCP server for in-app chat. The input holds credentials, so this action is not an MCP tool or an agent tool: only the studio UI and HTTP call it. The secret goes to the vault and no action returns it. Changes no project file.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "POST", path: "/api/integration" },
  id: "integration.create",
  input: Schema.Struct({
    ...IntegrationCreateFields,
  }),
  invalidates: ["integration.list"],
  mcp: { off: "secret" },
  needs: "studio.write",
  output: IntegrationSchema,
  scope: "device",
});

export { createIntegration };
