import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { PageFields, pageOf } from "../_core/list-page.js";
import { IntegrationSchema } from "./schema.js";

const listIntegration = defineAction({
  access: "read",
  agent: { off: "secret" },
  confirm: "none",
  description:
    "List the outside MCP servers saved for in-app chat: name, transport, status and the saved tool names. Never returns a secret. Not an MCP tool or an agent tool, because the matching create action takes credentials.",
  errors: [BadRequest],
  http: { method: "GET", path: "/api/integration" },
  id: "integration.list",
  input: Schema.Struct({
    ...PageFields,
  }),
  invalidates: [],
  mcp: { off: "secret" },
  needs: "studio.read",
  output: pageOf(IntegrationSchema),
  scope: "device",
});

export { listIntegration };
