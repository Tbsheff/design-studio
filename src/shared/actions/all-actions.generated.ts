// @generated
import { CanvasActions } from "./canvas/index.js";
import { CloudActions } from "./cloud/index.js";
import { CommentsActions } from "./comments/index.js";
import { DevserverActions } from "./devserver/index.js";
import { DirectEditActions } from "./direct-edit/index.js";
import { EventsActions } from "./events/index.js";
import { ExportActions } from "./export/index.js";
import { McpLifeActions } from "./mcp-life/index.js";
import { McpReadActions } from "./mcp-read/index.js";
import { OrgScopeActions } from "./org-scope/index.js";
import { PacksActions } from "./packs/index.js";
import { ProjectsActions } from "./projects/index.js";
import { PublishActions } from "./publish/index.js";
import { RunsActions } from "./runs/index.js";
import { SessionActions } from "./session/index.js";
import { ShareActions } from "./share/index.js";
import { ShipActions } from "./ship/index.js";
import { StudioActions } from "./studio/index.js";
import { VersionsActions } from "./versions/index.js";

const ALL_ACTIONS = {
  canvas: CanvasActions,
  cloud: CloudActions,
  comments: CommentsActions,
  devserver: DevserverActions,
  directEdit: DirectEditActions,
  events: EventsActions,
  export: ExportActions,
  mcpLife: McpLifeActions,
  mcpRead: McpReadActions,
  orgScope: OrgScopeActions,
  packs: PacksActions,
  projects: ProjectsActions,
  publish: PublishActions,
  runs: RunsActions,
  session: SessionActions,
  share: ShareActions,
  ship: ShipActions,
  studio: StudioActions,
  versions: VersionsActions,
} as const;

export { ALL_ACTIONS };
