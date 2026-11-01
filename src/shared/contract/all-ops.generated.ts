// @generated
import { CanvasOps } from "./canvas/index.js";
import { CloudOps } from "./cloud/index.js";
import { CommentsOps } from "./comments/index.js";
import { DevserverOps } from "./devserver/index.js";
import { DirectEditOps } from "./direct-edit/index.js";
import { EventsOps } from "./events/index.js";
import { ExportOps } from "./export/index.js";
import { McpLifeOps } from "./mcp-life/index.js";
import { McpReadOps } from "./mcp-read/index.js";
import { OrgScopeOps } from "./org-scope/index.js";
import { PacksOps } from "./packs/index.js";
import { ProjectsOps } from "./projects/index.js";
import { PublishOps } from "./publish/index.js";
import { RunsOps } from "./runs/index.js";
import { SessionOps } from "./session/index.js";
import { ShareOps } from "./share/index.js";
import { ShipOps } from "./ship/index.js";
import { StudioOps } from "./studio/index.js";
import { VersionsOps } from "./versions/index.js";

const ALL_OPS = {
  canvas: CanvasOps,
  cloud: CloudOps,
  comments: CommentsOps,
  devserver: DevserverOps,
  directEdit: DirectEditOps,
  events: EventsOps,
  export: ExportOps,
  mcpLife: McpLifeOps,
  mcpRead: McpReadOps,
  orgScope: OrgScopeOps,
  packs: PacksOps,
  projects: ProjectsOps,
  publish: PublishOps,
  runs: RunsOps,
  session: SessionOps,
  share: ShareOps,
  ship: ShipOps,
  studio: StudioOps,
  versions: VersionsOps,
} as const;

export { ALL_OPS };
