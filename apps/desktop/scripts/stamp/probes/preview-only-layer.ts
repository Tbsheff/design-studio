import { Context, Effect, Schema } from "effect";
import type { Layer } from "effect";

import type { Entries } from "../../../src/server/handlers/_core/handler.js";
import type { liveLayer } from "../../../src/server/main/live-layer.js";
import type { LocalOrgScope } from "../../../src/server/store/local-org-scope.js";
import type { LocalPrincipal } from "../../../src/server/store/local-principal.js";
import { defineAction } from "@design-studio/actions/_core/action";
import type { Input } from "@design-studio/actions/_core/action";
import type { ApprovalCard } from "@design-studio/actions/_core/approval-card";

interface ProbePreviewOnlyApi {
  readonly ok: boolean;
}

class ProbePreviewOnly extends Context.Service<
  ProbePreviewOnly,
  ProbePreviewOnlyApi
>()("design-studio/probe/ProbePreviewOnly") {
  declare public readonly access: "read";
}

const PROBE_ID = "probe.delete";

const deleteProbe = defineAction({
  access: "destructive",
  agent: { off: "ui-bootstrap" },
  confirm: "user",
  description:
    "Delete one probe thing. This action exists only to plant a type error.",
  errors: [],
  http: { method: "DELETE", path: "/api/probes" },
  id: PROBE_ID,
  input: Schema.Struct({}),
  invalidates: [],
  mcp: { off: "ui-bootstrap" },
  needs: "project.delete",
  output: Schema.Struct({}),
  scope: "device",
});

const handle = Effect.fn(PROBE_ID)(function* run(
  _input: Input<typeof deleteProbe>
) {
  yield* Effect.void;

  return {};
});

const preview = Effect.fn("probe.delete.preview")(function* run(
  _input: Input<typeof deleteProbe>
) {
  yield* ProbePreviewOnly;

  const card: ApprovalCard = {
    action: PROBE_ID,
    detail: "The probe thing goes away.",
    title: "Delete probe",
  };

  return card;
});

const ProbeEntries = {
  deleteProbe: { handle, preview },
} satisfies Entries<{ readonly deleteProbe: typeof deleteProbe }>;

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
  NeedsOfEntry<(typeof ProbeEntries)["deleteProbe"]>,
  Provided
>;

const everyLayerProvided: [Missing] extends [never] ? true : Missing = true;

export { everyLayerProvided };
