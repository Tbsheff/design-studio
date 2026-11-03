// @generated
import { CanvasActions } from "./canvas/index.js";
import { CloudActions } from "./cloud/index.js";
import { CommentActions } from "./comment/index.js";
import { ConnectionActions } from "./connection/index.js";
import { ContentActions } from "./content/index.js";
import { DevServerActions } from "./dev-server/index.js";
import { DirectEditActions } from "./direct-edit/index.js";
import { EventsActions } from "./events/index.js";
import { ExportActions } from "./export/index.js";
import { ImageActions } from "./image/index.js";
import { OrgScopeActions } from "./org-scope/index.js";
import { PackActions } from "./pack/index.js";
import { ProjectsActions } from "./projects/index.js";
import { PublishActions } from "./publish/index.js";
import { RunsActions } from "./runs/index.js";
import { SessionActions } from "./session/index.js";
import { ShareActions } from "./share/index.js";
import { ShipActions } from "./ship/index.js";
import { StudioActions } from "./studio/index.js";
import { VersionActions } from "./version/index.js";
import { ViewportActions } from "./viewport/index.js";
import { WorkspaceActions } from "./workspace/index.js";

const ALL_ACTIONS = {
  canvas: CanvasActions,
  cloud: CloudActions,
  comment: CommentActions,
  connection: ConnectionActions,
  content: ContentActions,
  devServer: DevServerActions,
  directEdit: DirectEditActions,
  events: EventsActions,
  export: ExportActions,
  image: ImageActions,
  orgScope: OrgScopeActions,
  pack: PackActions,
  projects: ProjectsActions,
  publish: PublishActions,
  runs: RunsActions,
  session: SessionActions,
  share: ShareActions,
  ship: ShipActions,
  studio: StudioActions,
  version: VersionActions,
  viewport: ViewportActions,
  workspace: WorkspaceActions,
} as const;

export { ALL_ACTIONS };
