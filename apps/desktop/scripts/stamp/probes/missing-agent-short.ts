import { Schema } from "effect";

import { defineAction } from "@design-studio/actions/_core/action";

const getProbe = defineAction({
  access: "read",
  agent: { lean: false, name: "get_probe", set: "core" },
  confirm: "none",
  description:
    "Get one probe thing. This action exists only to plant a type error.",
  errors: [],
  http: { method: "GET", path: "/api/probes" },
  id: "probe.get",
  input: Schema.Struct({}),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "studio.read",
  output: Schema.Struct({}),
  scope: "device",
});

export { getProbe };
