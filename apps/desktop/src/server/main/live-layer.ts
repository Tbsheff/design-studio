import { Layer } from "effect";

import { AccessibilityLive } from "../handlers/accessibility/live.js";
import { AnimationLive } from "../handlers/animation/live.js";
import { CanvasLive } from "../handlers/canvas/live.js";
import { CloudLive } from "../handlers/cloud/live.js";
import { CommentLive } from "../handlers/comment/live.js";
import { ComponentVariantLive } from "../handlers/component-variant/live.js";
import { ConnectionLive } from "../handlers/connection/live.js";
import { ContentLive } from "../handlers/content/live.js";
import { CritiqueLive } from "../handlers/critique/live.js";
import { DevServerLive } from "../handlers/dev-server/live.js";
import { DirectEditLive } from "../handlers/direct-edit/live.js";
import { EffectLive } from "../handlers/effect/live.js";
import { EventsLive } from "../handlers/events/live.js";
import { ExportLive } from "../handlers/export/live.js";
import { FillLive } from "../handlers/fill/live.js";
import { GalleryLive } from "../handlers/gallery/live.js";
import { GridLive } from "../handlers/grid/live.js";
import { IconLive } from "../handlers/icon/live.js";
import { ImageSearchLive } from "../handlers/image-search/live.js";
import { ImageLive } from "../handlers/image/live.js";
import { IntegrationLive } from "../handlers/integration/live.js";
import { MotionLive } from "../handlers/motion/live.js";
import { OrgScopeLive } from "../handlers/org-scope/live.js";
import { PackLive } from "../handlers/pack/live.js";
import { PageLive } from "../handlers/page/live.js";
import { PatternLive } from "../handlers/pattern/live.js";
import { ProjectLive } from "../handlers/project/live.js";
import { PropLive } from "../handlers/prop/live.js";
import { PublishLive } from "../handlers/publish/live.js";
import { RunLive } from "../handlers/run/live.js";
import { ScenarioLive } from "../handlers/scenario/live.js";
import { SessionLive } from "../handlers/session/live.js";
import { ShareLive } from "../handlers/share/live.js";
import { ShipLive } from "../handlers/ship/live.js";
import { SpacingLive } from "../handlers/spacing/live.js";
import { StackingLive } from "../handlers/stacking/live.js";
import { StateStyleLive } from "../handlers/state-style/live.js";
import { StudioLive } from "../handlers/studio/live.js";
import { TextStyleLive } from "../handlers/text-style/live.js";
import { TextLive } from "../handlers/text/live.js";
import { ThemeLive } from "../handlers/theme/live.js";
import { TokenLive } from "../handlers/token/live.js";
import { VersionLive } from "../handlers/version/live.js";
import { ViewportLive } from "../handlers/viewport/live.js";
import { WalkthroughLive } from "../handlers/walkthrough/live.js";
import { WorkspaceLive } from "../handlers/workspace/live.js";
import {
  Authorizer,
  LocalOrgScope,
  LocalPrincipal,
  ProjectAccess,
} from "../store/index.js";

const liveLayer = Layer.mergeAll(
  Authorizer.layer,
  LocalOrgScope.layer,
  LocalPrincipal.layer,
  ProjectAccess.layer,
  AccessibilityLive,
  AnimationLive,
  CanvasLive,
  CloudLive,
  CommentLive,
  ComponentVariantLive,
  ConnectionLive,
  ContentLive,
  CritiqueLive,
  DevServerLive,
  DirectEditLive,
  EffectLive,
  EventsLive,
  ExportLive,
  FillLive,
  GalleryLive,
  GridLive,
  IconLive,
  ImageLive,
  ImageSearchLive,
  IntegrationLive,
  MotionLive,
  OrgScopeLive,
  PackLive,
  PageLive,
  PatternLive,
  ProjectLive,
  PropLive,
  PublishLive,
  RunLive,
  ScenarioLive,
  SessionLive,
  ShareLive,
  ShipLive,
  SpacingLive,
  StackingLive,
  StateStyleLive,
  StudioLive,
  TextLive,
  TextStyleLive,
  ThemeLive,
  TokenLive,
  VersionLive,
  ViewportLive,
  WalkthroughLive,
  WorkspaceLive
);

type LiveServices = Layer.Success<typeof liveLayer>;

export { liveLayer };

export type { LiveServices };
