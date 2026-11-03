import { Layer } from "effect";

import { CanvasLive } from "../handlers/canvas/live.js";
import { CloudLive } from "../handlers/cloud/live.js";
import { CommentLive } from "../handlers/comment/live.js";
import { ConnectionLive } from "../handlers/connection/live.js";
import { DevServerLive } from "../handlers/dev-server/live.js";
import { DirectEditLive } from "../handlers/direct-edit/live.js";
import { EventsLive } from "../handlers/events/live.js";
import { ExportLive } from "../handlers/export/live.js";
import { OrgScopeLive } from "../handlers/org-scope/live.js";
import { PackLive } from "../handlers/pack/live.js";
import { ProjectsLive } from "../handlers/projects/live.js";
import { PublishLive } from "../handlers/publish/live.js";
import { RunsLive } from "../handlers/runs/live.js";
import { SessionLive } from "../handlers/session/live.js";
import { ShareLive } from "../handlers/share/live.js";
import { ShipLive } from "../handlers/ship/live.js";
import { StudioLive } from "../handlers/studio/live.js";
import { VersionLive } from "../handlers/version/live.js";
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
  CanvasLive,
  CloudLive,
  CommentLive,
  DevServerLive,
  DirectEditLive,
  EventsLive,
  ExportLive,
  ConnectionLive,
  WorkspaceLive,
  OrgScopeLive,
  PackLive,
  ProjectsLive,
  PublishLive,
  RunsLive,
  SessionLive,
  ShareLive,
  ShipLive,
  StudioLive,
  VersionLive
);

type LiveServices = Layer.Success<typeof liveLayer>;

export { liveLayer };

export type { LiveServices };
