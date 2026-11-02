import { Effect, Schema } from "effect";

import type { Handle } from "../../../src/server/handlers/_core/handler.js";
import { defineAction } from "../../../src/shared/actions/_core/action.js";
import type { Input } from "../../../src/shared/actions/_core/action.js";
import { NotFound } from "../../../src/shared/actions/_core/errors/not-found.js";

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
  return yield* new NotFound({ message: "The probe thing is not found." });
}) satisfies Handle<typeof getProbe>;

export { handle };
