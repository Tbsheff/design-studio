import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { IntegrationDeletedSchema, IntegrationIdFields } from "./schema.js";

const deleteIntegration = defineAction({
  access: "destructive",
  agent: { off: "secret" },
  confirm: "user",
  description:
    "Delete one saved outside MCP server and its secret from the vault. The approval card shows its name. Not an MCP tool or an agent tool, because the matching create action takes credentials.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "DELETE", path: "/api/integration/:integrationId" },
  id: "integration.delete",
  input: Schema.Struct({
    ...IntegrationIdFields,
  }),
  invalidates: ["integration.list"],
  mcp: { off: "secret" },
  needs: "studio.write",
  output: IntegrationDeletedSchema,
  scope: "device",
});

export { deleteIntegration };
