import { Schema } from "effect";

import { defineAction } from "../_core/action.js";

const healthStudio = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Get the health of the local studio server. It returns the app version and the preview origin. It does not return a secret.",
  errors: [],
  http: { method: "GET", path: "/api/health" },
  id: "studio.health",
  input: Schema.Struct({}),
  invalidates: [],
  mcp: { name: "get_studio_health" },
  needs: "studio.read",
  output: Schema.Struct({
    ok: Schema.Boolean,
    previewOrigin: Schema.String,
    version: Schema.String,
  }),
  scope: "device",
});

export { healthStudio };
