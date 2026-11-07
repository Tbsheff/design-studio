import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  IntegrationIdFields,
  IntegrationSchema,
  IntegrationUpdateFields,
} from "./schema.js";

const updateIntegration = defineAction({
  access: "edit",
  agent: { off: "secret" },
  confirm: "none",
  description:
    "Change one saved outside MCP server: its command or url, its secret, whether it is on, and the read-only tool allowlist. A null field stays as it is. Not an MCP tool or an agent tool, because the input can hold a secret. No action returns the secret.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PATCH", path: "/api/integration/:integrationId" },
  id: "integration.update",
  input: Schema.Struct({
    ...IntegrationIdFields,
    ...IntegrationUpdateFields,
  }),
  invalidates: ["integration.list"],
  mcp: { off: "secret" },
  needs: "studio.write",
  output: IntegrationSchema,
  scope: "device",
});

export { updateIntegration };
