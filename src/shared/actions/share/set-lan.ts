import { Schema } from "effect";

import { defineAction } from "../_core/action.js";
import { ShareServerResultSchema } from "./schema.js";

const setLanShare = defineAction({
  access: "edit",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Turn Allow on local network on or off for the share listener. When it is on, other devices on your network can open share links too.",
  errors: [],
  http: { method: "PUT", path: "/api/shares/lan" },
  id: "share.setLan",
  input: Schema.Struct({
    isOn: Schema.Boolean,
  }),
  invalidates: ["share.list"],
  mcp: { off: "ui-bootstrap" },
  needs: "project.update",
  output: ShareServerResultSchema,
  scope: "device",
});

export { setLanShare };
