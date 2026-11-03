import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PublishCliStateSchema } from "./schema.js";

const setPublish = defineAction({
  access: "edit",
  agent: { off: "secret" },
  confirm: "none",
  description:
    "Set the Cloudflare account that publish uses. Send accountId null to use the default account. Returns the new state of the Cloudflare command line tool.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "PUT", path: "/api/publish/settings" },
  id: "publish.set",
  input: Schema.Struct({ accountId: Schema.NullOr(Schema.String) }),
  invalidates: ["publish.get", "publish.inspect"],
  mcp: { off: "secret" },
  needs: "org.update",
  output: PublishCliStateSchema,
  scope: "device",
});

export { setPublish };
