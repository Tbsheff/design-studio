import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { CloudStateViewSchema } from "./schema.js";

const setCloud = defineAction({
  access: "edit",
  agent: { off: "secret" },
  confirm: "none",
  description:
    "Set the cloud session. The desktop shell pushes the device token after sign-in. The token stays in memory and no action returns it.",
  errors: [],
  http: { method: "PUT", path: "/api/cloud/session" },
  id: "cloud.set",
  input: Schema.Struct({
    expiresAt: Schema.Number.annotate({
      description: "Token expiry in epoch milliseconds",
    }),
    jwt: Schema.String,
  }),
  invalidates: ["cloud.get"],
  mcp: { off: "secret" },
  needs: "studio.read",
  output: CloudStateViewSchema,
  scope: "device",
});

export { setCloud };
