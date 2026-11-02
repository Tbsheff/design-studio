// @generated
import { CanvasLive } from "./canvas/live.js";
import { CloudLive } from "./cloud/live.js";
import { CommentsLive } from "./comments/live.js";
import { DevserverLive } from "./devserver/live.js";
import { DirectEditLive } from "./direct-edit/live.js";
import { EventsLive } from "./events/live.js";
import { ExportLive } from "./export/live.js";
import { McpLifeLive } from "./mcp-life/live.js";
import { McpReadLive } from "./mcp-read/live.js";
import { OrgScopeLive } from "./org-scope/live.js";
import { PacksLive } from "./packs/live.js";
import { ProjectsLive } from "./projects/live.js";
import { PublishLive } from "./publish/live.js";
import { RunsLive } from "./runs/live.js";
import { SessionLive } from "./session/live.js";
import { ShareLive } from "./share/live.js";
import { ShipLive } from "./ship/live.js";
import { StudioLive } from "./studio/live.js";
import { VersionsLive } from "./versions/live.js";

const ALL_LIVE = {
  canvas: CanvasLive,
  cloud: CloudLive,
  comments: CommentsLive,
  devserver: DevserverLive,
  directEdit: DirectEditLive,
  events: EventsLive,
  export: ExportLive,
  mcpLife: McpLifeLive,
  mcpRead: McpReadLive,
  orgScope: OrgScopeLive,
  packs: PacksLive,
  projects: ProjectsLive,
  publish: PublishLive,
  runs: RunsLive,
  session: SessionLive,
  share: ShareLive,
  ship: ShipLive,
  studio: StudioLive,
  versions: VersionsLive,
} as const;

export { ALL_LIVE };
