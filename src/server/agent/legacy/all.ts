import { CANVAS_AGENT_TOOLS } from "./canvas.js";
import { CLOUD_AGENT_TOOLS } from "./cloud.js";
import { COMMENTS_AGENT_TOOLS } from "./comments.js";
import { DEVSERVER_AGENT_TOOLS } from "./devserver.js";
import { DIRECT_EDIT_AGENT_TOOLS } from "./direct-edit.js";
import { EVENTS_AGENT_TOOLS } from "./events.js";
import { EXPORT_AGENT_TOOLS } from "./export.js";
import { MCP_LIFE_AGENT_TOOLS } from "./mcp-life.js";
import { MCP_READ_AGENT_TOOLS } from "./mcp-read.js";
import { ORG_SCOPE_AGENT_TOOLS } from "./org-scope.js";
import { PACKS_AGENT_TOOLS } from "./packs.js";
import { PROJECTS_AGENT_TOOLS } from "./projects.js";
import { PUBLISH_AGENT_TOOLS } from "./publish.js";
import { RUNS_AGENT_TOOLS } from "./runs.js";
import { SESSION_AGENT_TOOLS } from "./session.js";
import { SHARE_AGENT_TOOLS } from "./share.js";
import { SHIP_AGENT_TOOLS } from "./ship.js";
import { STUDIO_AGENT_TOOLS } from "./studio.js";
import { VERSIONS_AGENT_TOOLS } from "./versions.js";

const LEGACY_AGENT_TOOLS: readonly string[] = [
  ...CANVAS_AGENT_TOOLS,
  ...CLOUD_AGENT_TOOLS,
  ...COMMENTS_AGENT_TOOLS,
  ...DEVSERVER_AGENT_TOOLS,
  ...DIRECT_EDIT_AGENT_TOOLS,
  ...EVENTS_AGENT_TOOLS,
  ...EXPORT_AGENT_TOOLS,
  ...MCP_LIFE_AGENT_TOOLS,
  ...MCP_READ_AGENT_TOOLS,
  ...ORG_SCOPE_AGENT_TOOLS,
  ...PACKS_AGENT_TOOLS,
  ...PROJECTS_AGENT_TOOLS,
  ...PUBLISH_AGENT_TOOLS,
  ...RUNS_AGENT_TOOLS,
  ...SESSION_AGENT_TOOLS,
  ...SHARE_AGENT_TOOLS,
  ...SHIP_AGENT_TOOLS,
  ...STUDIO_AGENT_TOOLS,
  ...VERSIONS_AGENT_TOOLS,
];

export { LEGACY_AGENT_TOOLS };
