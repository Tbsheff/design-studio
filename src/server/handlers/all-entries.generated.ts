// @generated
import { CanvasEntries } from "./canvas/handlers.js";
import { CloudEntries } from "./cloud/handlers.js";
import { CommentEntries } from "./comment/handlers.js";
import { ConnectionEntries } from "./connection/handlers.js";
import { DevServerEntries } from "./dev-server/handlers.js";
import { DirectEditEntries } from "./direct-edit/handlers.js";
import { EventsEntries } from "./events/handlers.js";
import { ExportEntries } from "./export/handlers.js";
import { OrgScopeEntries } from "./org-scope/handlers.js";
import { PackEntries } from "./pack/handlers.js";
import { ProjectsEntries } from "./projects/handlers.js";
import { PublishEntries } from "./publish/handlers.js";
import { RunsEntries } from "./runs/handlers.js";
import { SessionEntries } from "./session/handlers.js";
import { ShareEntries } from "./share/handlers.js";
import { ShipEntries } from "./ship/handlers.js";
import { StudioEntries } from "./studio/handlers.js";
import { VersionEntries } from "./version/handlers.js";
import { WorkspaceEntries } from "./workspace/handlers.js";

const ALL_ENTRIES = {
  canvas: CanvasEntries,
  cloud: CloudEntries,
  comment: CommentEntries,
  connection: ConnectionEntries,
  devServer: DevServerEntries,
  directEdit: DirectEditEntries,
  events: EventsEntries,
  export: ExportEntries,
  orgScope: OrgScopeEntries,
  pack: PackEntries,
  projects: ProjectsEntries,
  publish: PublishEntries,
  runs: RunsEntries,
  session: SessionEntries,
  share: ShareEntries,
  ship: ShipEntries,
  studio: StudioEntries,
  version: VersionEntries,
  workspace: WorkspaceEntries,
} as const;

export { ALL_ENTRIES };
