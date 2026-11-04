import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { PublishCliStateSchema, QueryFlagSchema } from "./schema.js";

const getPublish = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Get the state of the Cloudflare command line tool: installed version, sign-in, accounts, the chosen account, its workers.dev subdomain and a running sign-in. Send fresh 1 to check it again now. Read only.",
  errors: [],
  http: { method: "GET", path: "/api/publish/cli" },
  id: "publish.get",
  input: Schema.Struct({ fresh: QueryFlagSchema }),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "studio.read",
  output: PublishCliStateSchema,
  scope: "device",
});

export { getPublish };
