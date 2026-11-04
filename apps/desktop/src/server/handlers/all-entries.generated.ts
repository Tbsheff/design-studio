// @generated
import { AnimationEntries } from "./animation/handlers.js";
import { CanvasEntries } from "./canvas/handlers.js";
import { CloudEntries } from "./cloud/handlers.js";
import { CommentEntries } from "./comment/handlers.js";
import { ConnectionEntries } from "./connection/handlers.js";
import { ContentEntries } from "./content/handlers.js";
import { CritiqueEntries } from "./critique/handlers.js";
import { DevServerEntries } from "./dev-server/handlers.js";
import { DirectEditEntries } from "./direct-edit/handlers.js";
import { EventsEntries } from "./events/handlers.js";
import { ExportEntries } from "./export/handlers.js";
import { GalleryEntries } from "./gallery/handlers.js";
import { ImageEntries } from "./image/handlers.js";
import { OrgScopeEntries } from "./org-scope/handlers.js";
import { PackEntries } from "./pack/handlers.js";
import { ProjectEntries } from "./project/handlers.js";
import { PropEntries } from "./prop/handlers.js";
import { PublishEntries } from "./publish/handlers.js";
import { RunEntries } from "./run/handlers.js";
import { ScenarioEntries } from "./scenario/handlers.js";
import { SessionEntries } from "./session/handlers.js";
import { ShareEntries } from "./share/handlers.js";
import { ShipEntries } from "./ship/handlers.js";
import { StudioEntries } from "./studio/handlers.js";
import { TokenEntries } from "./token/handlers.js";
import { VersionEntries } from "./version/handlers.js";
import { ViewportEntries } from "./viewport/handlers.js";
import { WorkspaceEntries } from "./workspace/handlers.js";

const ALL_ENTRIES = {
  animation: AnimationEntries,
  canvas: CanvasEntries,
  cloud: CloudEntries,
  comment: CommentEntries,
  connection: ConnectionEntries,
  content: ContentEntries,
  critique: CritiqueEntries,
  devServer: DevServerEntries,
  directEdit: DirectEditEntries,
  events: EventsEntries,
  export: ExportEntries,
  gallery: GalleryEntries,
  image: ImageEntries,
  orgScope: OrgScopeEntries,
  pack: PackEntries,
  project: ProjectEntries,
  prop: PropEntries,
  publish: PublishEntries,
  run: RunEntries,
  scenario: ScenarioEntries,
  session: SessionEntries,
  share: ShareEntries,
  ship: ShipEntries,
  studio: StudioEntries,
  token: TokenEntries,
  version: VersionEntries,
  viewport: ViewportEntries,
  workspace: WorkspaceEntries,
} as const;

export { ALL_ENTRIES };
