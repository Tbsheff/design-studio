// @generated
import { CanvasEntries } from "./canvas/handlers.js";
import { CloudEntries } from "./cloud/handlers.js";
import { CommentsEntries } from "./comments/handlers.js";
import { DevserverEntries } from "./devserver/handlers.js";
import { DirectEditEntries } from "./direct-edit/handlers.js";
import { EventsEntries } from "./events/handlers.js";
import { ExportEntries } from "./export/handlers.js";
import { McpLifeEntries } from "./mcp-life/handlers.js";
import { McpReadEntries } from "./mcp-read/handlers.js";
import { OrgScopeEntries } from "./org-scope/handlers.js";
import { PacksEntries } from "./packs/handlers.js";
import { ProjectsEntries } from "./projects/handlers.js";
import { PublishEntries } from "./publish/handlers.js";
import { RunsEntries } from "./runs/handlers.js";
import { SessionEntries } from "./session/handlers.js";
import { ShareEntries } from "./share/handlers.js";
import { ShipEntries } from "./ship/handlers.js";
import { StudioEntries } from "./studio/handlers.js";
import { VersionsEntries } from "./versions/handlers.js";

const ALL_ENTRIES = {
  canvas: CanvasEntries,
  cloud: CloudEntries,
  comments: CommentsEntries,
  devserver: DevserverEntries,
  directEdit: DirectEditEntries,
  events: EventsEntries,
  export: ExportEntries,
  mcpLife: McpLifeEntries,
  mcpRead: McpReadEntries,
  orgScope: OrgScopeEntries,
  packs: PacksEntries,
  projects: ProjectsEntries,
  publish: PublishEntries,
  runs: RunsEntries,
  session: SessionEntries,
  share: ShareEntries,
  ship: ShipEntries,
  studio: StudioEntries,
  versions: VersionsEntries,
} as const;

export { ALL_ENTRIES };
