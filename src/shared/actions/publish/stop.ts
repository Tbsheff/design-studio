import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { BadRequest } from "../_core/errors/bad-request.js";
import { Conflict } from "../_core/errors/conflict.js";
import { NotFound } from "../_core/errors/not-found.js";
import { PublishCliStateSchema } from "./schema.js";

const stopPublish = defineAction({
  access: "edit",
  agent: { off: "secret" },
  confirm: "none",
  description:
    "Stop the running Cloudflare sign-in. Returns the new state of the Cloudflare command line tool.",
  errors: [BadRequest, Conflict, NotFound],
  http: { method: "DELETE", path: "/api/publish/login" },
  id: "publish.stop",
  input: Schema.Struct({}),
  invalidates: ["publish.get"],
  mcp: { off: "secret" },
  needs: "org.update",
  output: PublishCliStateSchema,
  scope: "device",
});

export { stopPublish };
