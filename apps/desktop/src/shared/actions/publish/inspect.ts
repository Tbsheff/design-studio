import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { PublishBackendStateSchema, QueryFlagSchema } from "./schema.js";

const inspectPublish = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Inspect the publish Worker setup: mode, URL, account, database, key store and each setup step with its status. Send check 1 to check the Worker again now. Read only.",
  errors: [],
  http: { method: "GET", path: "/api/publish/backend" },
  id: "publish.inspect",
  input: Schema.Struct({ check: QueryFlagSchema }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "studio.read",
  output: PublishBackendStateSchema,
  scope: "device",
});

export { inspectPublish };
