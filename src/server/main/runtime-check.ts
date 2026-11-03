import type { Effect, Layer } from "effect";

import type { CanvasEntries } from "../handlers/canvas/handlers.js";
import type { CloudEntries } from "../handlers/cloud/handlers.js";
import type { CommentEntries } from "../handlers/comment/handlers.js";
import type { ConnectionEntries } from "../handlers/connection/handlers.js";
import type { DevServerEntries } from "../handlers/dev-server/handlers.js";
import type { DirectEditEntries } from "../handlers/direct-edit/handlers.js";
import type { EventsEntries } from "../handlers/events/handlers.js";
import type { ExportEntries } from "../handlers/export/handlers.js";
import type { OrgScopeEntries } from "../handlers/org-scope/handlers.js";
import type { PackEntries } from "../handlers/pack/handlers.js";
import type { ProjectsEntries } from "../handlers/projects/handlers.js";
import type { PublishEntries } from "../handlers/publish/handlers.js";
import type { RunsEntries } from "../handlers/runs/handlers.js";
import type { SessionEntries } from "../handlers/session/handlers.js";
import type { ShareEntries } from "../handlers/share/handlers.js";
import type { ShipEntries } from "../handlers/ship/handlers.js";
import type { StudioEntries } from "../handlers/studio/handlers.js";
import type { VersionEntries } from "../handlers/version/handlers.js";
import type { WorkspaceEntries } from "../handlers/workspace/handlers.js";
import type {
  Authorizer,
  LocalOrgScope,
  LocalPrincipal,
  ProjectAccess,
} from "../store/index.js";
import type { liveLayer } from "./live-layer.js";

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

type NeedsOf<DomainEntries> = {
  readonly [Domain in keyof DomainEntries]: {
    readonly [Action in keyof DomainEntries[Domain]]: NeedsOfEntry<
      DomainEntries[Domain][Action]
    >;
  }[keyof DomainEntries[Domain]];
}[keyof DomainEntries];

interface EntriesByDomain {
  readonly canvas: typeof CanvasEntries;
  readonly cloud: typeof CloudEntries;
  readonly comments: typeof CommentEntries;
  readonly devserver: typeof DevServerEntries;
  readonly directEdit: typeof DirectEditEntries;
  readonly events: typeof EventsEntries;
  readonly export: typeof ExportEntries;
  readonly mcpLife: typeof ConnectionEntries;
  readonly mcpRead: typeof WorkspaceEntries;
  readonly orgScope: typeof OrgScopeEntries;
  readonly packs: typeof PackEntries;
  readonly projects: typeof ProjectsEntries;
  readonly publish: typeof PublishEntries;
  readonly runs: typeof RunsEntries;
  readonly session: typeof SessionEntries;
  readonly share: typeof ShareEntries;
  readonly ship: typeof ShipEntries;
  readonly studio: typeof StudioEntries;
  readonly versions: typeof VersionEntries;
}

type RunnerNeeds = Authorizer | ProjectAccess;

type Missing = Exclude<NeedsOf<EntriesByDomain> | RunnerNeeds, Provided>;

const everyLayerProvided: [Missing] extends [never] ? true : Missing = true;

export { everyLayerProvided };
