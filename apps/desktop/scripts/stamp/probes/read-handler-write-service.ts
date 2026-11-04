import { Context, Effect, Schema } from "effect";

import type { Handle } from "../../../src/server/handlers/_core/handler.js";
import { defineAction } from "../../../src/shared/actions/_core/action.js";
import type { Input } from "../../../src/shared/actions/_core/action.js";

interface ProbeWriterApi {
  readonly ok: boolean;
}

class ProbeWriter extends Context.Service<ProbeWriter, ProbeWriterApi>()(
  "design-studio/probe/ProbeWriter"
) {
  declare public readonly access: "write";
}

const getProbe = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
  confirm: "none",
  description:
    "Run one probe thing. This action exists only to plant a type error.",
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

const handle = Effect.fn("probe.get")(function* run(
  _input: Input<typeof getProbe>
) {
  yield* ProbeWriter;

  return {};
}) satisfies Handle<typeof getProbe>;

export { handle };
