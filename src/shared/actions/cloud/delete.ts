import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { CloudStateViewSchema } from "./schema.js";

const deleteCloud = defineAction({
  access: "edit",
  agent: { off: "secret" },
  confirm: "none",
  description:
    "Delete the cloud session held in memory. The studio stays signed out of the cloud until the desktop shell pushes a new token.",
  errors: [],
  http: { method: "DELETE", path: "/api/cloud/session" },
  id: "cloud.delete",
  input: Schema.Struct({}),
  invalidates: ["cloud.get"],
  mcp: { off: "secret" },
  needs: "studio.read",
  output: CloudStateViewSchema,
  scope: "device",
});

export { deleteCloud };
