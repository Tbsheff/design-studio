import { Context, Effect, Schema } from "effect";
import type { Layer } from "effect";

import type { Entries } from "../../../src/server/handlers/_core/handler.js";
import type { liveLayer } from "../../../src/server/main/live-layer.js";
import type { LocalOrgScope } from "../../../src/server/store/local-org-scope.js";
import type { LocalPrincipal } from "../../../src/server/store/local-principal.js";
import { defineAction } from "../../../src/shared/actions/_core/action.js";
import type { Input } from "../../../src/shared/actions/_core/action.js";

interface ProbeUnwiredApi {
  readonly ok: boolean;
}

class ProbeUnwired extends Context.Service<ProbeUnwired, ProbeUnwiredApi>()(
  "design-studio/probe/ProbeUnwired"
) {
  declare public readonly access: "read";
}

const getProbe = defineAction({
  access: "read",
  agent: { off: "ui-bootstrap" },
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

const handle = Effect.fn("probe.get")(function* run(
  _input: Input<typeof getProbe>
) {
  yield* ProbeUnwired;

  return {};
});

const ProbeEntries = {
  getProbe: { handle },
} satisfies Entries<{ readonly getProbe: typeof getProbe }>;

type Provided =
  | Layer.Success<typeof liveLayer>
  | LocalOrgScope
  | LocalPrincipal;

type NeedsOfFn<Fn> = Fn extends (
  input: never
) => Effect.Effect<unknown, unknown, infer Needs>
  ? Needs
  : never;

type NeedsOfEntry<Entry> = {
  readonly [Part in keyof Entry]: NeedsOfFn<Entry[Part]>;
}[keyof Entry];

type Missing = Exclude<
  NeedsOfEntry<(typeof ProbeEntries)["getProbe"]>,
  Provided
>;

const everyLayerProvided: [Missing] extends [never] ? true : Missing = true;

export { everyLayerProvided };
