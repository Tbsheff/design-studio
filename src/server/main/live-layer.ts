import { Layer } from "effect";

import { CanvasLive } from "../handlers/canvas/live.js";
import { CloudLive } from "../handlers/cloud/live.js";
import { CommentsLive } from "../handlers/comments/live.js";
import { DevserverLive } from "../handlers/devserver/live.js";
import { DirectEditLive } from "../handlers/direct-edit/live.js";
import { EventsLive } from "../handlers/events/live.js";
import { ExportLive } from "../handlers/export/live.js";
import { McpLifeLive } from "../handlers/mcp-life/live.js";
import { McpReadLive } from "../handlers/mcp-read/live.js";
import { OrgScopeLive } from "../handlers/org-scope/live.js";
import { PacksLive } from "../handlers/packs/live.js";
import { ProjectsLive } from "../handlers/projects/live.js";
import { PublishLive } from "../handlers/publish/live.js";
import { RunsLive } from "../handlers/runs/live.js";
import { SessionLive } from "../handlers/session/live.js";
import { ShareLive } from "../handlers/share/live.js";
import { ShipLive } from "../handlers/ship/live.js";
import { StudioLive } from "../handlers/studio/live.js";
import { VersionsLive } from "../handlers/versions/live.js";
import { Authorizer } from "../store/authorizer.js";
import { LocalOrgScope } from "../store/local-org-scope.js";
import { LocalPrincipal } from "../store/local-principal.js";
import { ProjectAccess } from "../store/project-access.js";

const liveLayer = Layer.mergeAll(
  Authorizer.layer,
  LocalOrgScope.layer,
  LocalPrincipal.layer,
  ProjectAccess.layer,
  CanvasLive,
  CloudLive,
  CommentsLive,
  DevserverLive,
  DirectEditLive,
  EventsLive,
  ExportLive,
  McpLifeLive,
  McpReadLive,
  OrgScopeLive,
  PacksLive,
  ProjectsLive,
  PublishLive,
  RunsLive,
  SessionLive,
  ShareLive,
  ShipLive,
  StudioLive,
  VersionsLive
);

type LiveServices = Layer.Success<typeof liveLayer>;

export { liveLayer };

export type { LiveServices };
