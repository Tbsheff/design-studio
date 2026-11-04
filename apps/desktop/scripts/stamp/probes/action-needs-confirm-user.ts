import { Schema } from "effect";

import { defineAction } from "@design-studio/actions/_core/action";

const deleteProbe = defineAction({
  access: "destructive",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Get one probe thing. This action exists only to plant a type error.",
  errors: [],
  http: { method: "DELETE", path: "/api/probes" },
  id: "probe.delete",
  input: Schema.Struct({}),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "studio.read",
  output: Schema.Struct({}),
  scope: "device",
});

export { deleteProbe };
