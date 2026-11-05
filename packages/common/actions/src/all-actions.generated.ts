// @generated
import { AnimationActions } from "./animation/index.js";
import { CanvasActions } from "./canvas/index.js";
import { CloudActions } from "./cloud/index.js";
import { CommentActions } from "./comment/index.js";
import { ConnectionActions } from "./connection/index.js";
import { ContentActions } from "./content/index.js";
import { CritiqueActions } from "./critique/index.js";
import { DevServerActions } from "./dev-server/index.js";
import { DirectEditActions } from "./direct-edit/index.js";
import { EventsActions } from "./events/index.js";
import { ExportActions } from "./export/index.js";
import { FillActions } from "./fill/index.js";
import { GalleryActions } from "./gallery/index.js";
import { ImageActions } from "./image/index.js";
import { MotionActions } from "./motion/index.js";
import { OrgScopeActions } from "./org-scope/index.js";
import { PackActions } from "./pack/index.js";
import { ProjectActions } from "./project/index.js";
import { PropActions } from "./prop/index.js";
import { PublishActions } from "./publish/index.js";
import { RunActions } from "./run/index.js";
import { ScenarioActions } from "./scenario/index.js";
import { SessionActions } from "./session/index.js";
import { ShareActions } from "./share/index.js";
import { ShipActions } from "./ship/index.js";
import { SpacingActions } from "./spacing/index.js";
import { StackingActions } from "./stacking/index.js";
import { StateStyleActions } from "./state-style/index.js";
import { StudioActions } from "./studio/index.js";
import { TextActions } from "./text/index.js";
import { TokenActions } from "./token/index.js";
import { VersionActions } from "./version/index.js";
import { ViewportActions } from "./viewport/index.js";
import { WorkspaceActions } from "./workspace/index.js";

const ALL_ACTIONS = {
  animation: AnimationActions,
  canvas: CanvasActions,
  cloud: CloudActions,
  comment: CommentActions,
  connection: ConnectionActions,
  content: ContentActions,
  critique: CritiqueActions,
  devServer: DevServerActions,
  directEdit: DirectEditActions,
  events: EventsActions,
  export: ExportActions,
  fill: FillActions,
  gallery: GalleryActions,
  image: ImageActions,
  motion: MotionActions,
  orgScope: OrgScopeActions,
  pack: PackActions,
  project: ProjectActions,
  prop: PropActions,
  publish: PublishActions,
  run: RunActions,
  scenario: ScenarioActions,
  session: SessionActions,
  share: ShareActions,
  ship: ShipActions,
  spacing: SpacingActions,
  stacking: StackingActions,
  stateStyle: StateStyleActions,
  studio: StudioActions,
  text: TextActions,
  token: TokenActions,
  version: VersionActions,
  viewport: ViewportActions,
  workspace: WorkspaceActions,
} as const;

export { ALL_ACTIONS };
