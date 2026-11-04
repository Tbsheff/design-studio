import { Schema } from "effect";

import { defineAction } from "@design-studio/actions/_core/action";

const getProbe = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Get one probe thing. This action exists only to plant a type error.",
  errors: [],
  http: { method: "GET", path: "/api/probes/:thingId" },
  id: "probe.get",
  input: Schema.Struct({}),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "studio.read",
  output: Schema.Struct({}),
  scope: "device",
});

export { getProbe };
