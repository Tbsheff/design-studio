import type { Effect, Layer } from "effect";

import type { AllEntries } from "../handlers/all-entries.generated.js";
import type { Authorizer } from "../store/authorizer.js";
import type { LocalOrgScope } from "../store/local-org-scope.js";
import type { LocalPrincipal } from "../store/local-principal.js";
import type { ProjectAccess } from "../store/project-access.js";
import type { StudioLive } from "./live-layer.js";

type Provided =
  | Layer.Success<typeof StudioLive>
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

type NeedsOf<EntryMap> = {
  readonly [Ctx in keyof EntryMap]: {
    readonly [Action in keyof EntryMap[Ctx]]: NeedsOfEntry<
      EntryMap[Ctx][Action]
    >;
  }[keyof EntryMap[Ctx]];
}[keyof EntryMap];

type RunnerNeeds = Authorizer | ProjectAccess;

type Missing = Exclude<NeedsOf<typeof AllEntries> | RunnerNeeds, Provided>;

const everyLayerProvided: [Missing] extends [never] ? true : Missing = true;

export { everyLayerProvided };
