import type { ToolSpec } from "../edit-kit.js";
import { guardTools } from "./guard.js";

const MCP_LIFE_LEGACY_TOOLS_UNGUARDED: ToolSpec[] = [];

const MCP_LIFE_LEGACY_TOOLS = guardTools(MCP_LIFE_LEGACY_TOOLS_UNGUARDED);

export { MCP_LIFE_LEGACY_TOOLS };
