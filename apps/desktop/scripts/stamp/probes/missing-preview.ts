import { Effect, Schema } from "effect";

import type {
  Entries,
  Handle,
} from "../../../src/server/handlers/_core/handler.js";
import { defineAction } from "@design-studio/actions/_core/action";
import type { Input } from "@design-studio/actions/_core/action";

const deleteProbe = defineAction({
  access: "destructive",
  agent: { off: "ui-bootstrap" },
  confirm: "user",
  description:
    "Run one probe thing. This action exists only to plant a type error.",
  errors: [],
  http: { method: "DELETE", path: "/api/probes" },
  id: "probe.delete",
  input: Schema.Struct({}),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.delete",
  output: Schema.Struct({}),
  scope: "device",
});

const handle = Effect.fn("probe.delete")(function* run(
  _input: Input<typeof deleteProbe>
) {
  yield* Effect.void;

  return {};
}) satisfies Handle<typeof deleteProbe>;

const ProbeEntries = {
  deleteProbe: { handle },
} satisfies Entries<{ readonly deleteProbe: typeof deleteProbe }>;

export { ProbeEntries };
