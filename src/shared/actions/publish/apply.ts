import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import {
  PublishBackendModeSchema,
  PublishBackendStateSchema,
} from "./schema.js";

const applyPublish = defineAction({
  access: "edit",
  agent: { off: "secret" },
  confirm: "none",
  description:
    "Set up the publish backend. Send mode local for a Worker on this device, or mode cloudflare to deploy the publish Worker to the chosen Cloudflare account. Returns the new backend state.",
  errors: [BadRequest, NotFound],
  http: { method: "POST", path: "/api/publish/backend/setup" },
  id: "publish.apply",
  input: Schema.Struct({ mode: PublishBackendModeSchema }),
  invalidates: ["publish.inspect"],
  mcp: { off: "secret" },
  needs: "org.update",
  output: PublishBackendStateSchema,
  scope: "device",
});

export { applyPublish };
