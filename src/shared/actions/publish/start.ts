import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PublishCliStateSchema } from "./schema.js";

const startPublish = defineAction({
  access: "edit",
  agent: { off: "secret" },
  confirm: "none",
  description:
    "Start the Cloudflare sign-in in the browser. Send keyring false to keep the token out of the system keychain and narrow false to ask for every scope. Returns the new state of the Cloudflare command line tool.",
  errors: [BadRequest, NotFound],
  http: { method: "POST", path: "/api/publish/login" },
  id: "publish.start",
  input: Schema.Struct({ keyring: Schema.Boolean, narrow: Schema.Boolean }),
  invalidates: ["publish.get"],
  mcp: { off: "secret" },
  needs: "org.update",
  output: PublishCliStateSchema,
  scope: "device",
});

export { startPublish };
