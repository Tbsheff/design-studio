import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { CloudViewSchema } from "./schema.js";

const getCloud = defineAction({
  access: "read",
  agent: { off: "secret" },
  confirm: "none",
  description:
    "Get the local cloud sign-in state with the user and the org list. The state is signed-out, signed-in or expired. It never returns the device token.",
  errors: [],
  http: { method: "GET", path: "/api/cloud/session" },
  id: "cloud.get",
  input: Schema.Struct({}),
  invalidates: [],
  mcp: { off: "secret" },
  needs: "studio.read",
  output: CloudViewSchema,
  scope: "device",
});

export { getCloud };
