// @generated
import { CanvasLive } from "./canvas/live.js";
import { CloudLive } from "./cloud/live.js";
import { CommentLive } from "./comment/live.js";
import { ConnectionLive } from "./connection/live.js";
import { ContentLive } from "./content/live.js";
import { DevServerLive } from "./dev-server/live.js";
import { DirectEditLive } from "./direct-edit/live.js";
import { EventsLive } from "./events/live.js";
import { ExportLive } from "./export/live.js";
import { ImageLive } from "./image/live.js";
import { OrgScopeLive } from "./org-scope/live.js";
import { PackLive } from "./pack/live.js";
import { ProjectLive } from "./project/live.js";
import { PublishLive } from "./publish/live.js";
import { RunsLive } from "./runs/live.js";
import { SessionLive } from "./session/live.js";
import { ShareLive } from "./share/live.js";
import { ShipLive } from "./ship/live.js";
import { StudioLive } from "./studio/live.js";
import { TokenLive } from "./token/live.js";
import { VersionLive } from "./version/live.js";
import { ViewportLive } from "./viewport/live.js";
import { WorkspaceLive } from "./workspace/live.js";

const ALL_LIVE = {
  canvas: CanvasLive,
  cloud: CloudLive,
  comment: CommentLive,
  connection: ConnectionLive,
  content: ContentLive,
  devServer: DevServerLive,
  directEdit: DirectEditLive,
  events: EventsLive,
  export: ExportLive,
  image: ImageLive,
  orgScope: OrgScopeLive,
  pack: PackLive,
  project: ProjectLive,
  publish: PublishLive,
  runs: RunsLive,
  session: SessionLive,
  share: ShareLive,
  ship: ShipLive,
  studio: StudioLive,
  token: TokenLive,
  version: VersionLive,
  viewport: ViewportLive,
  workspace: WorkspaceLive,
} as const;

export { ALL_LIVE };
