import { DOCTOR_TOOLS } from "../doctor-tools.js";
import type { ToolSpec } from "../edit-kit.js";
import { guardTools } from "./guard.js";

const MCP_READ_LEGACY_TOOLS_UNGUARDED: ToolSpec[] = [...DOCTOR_TOOLS];

const MCP_READ_LEGACY_TOOLS = guardTools(MCP_READ_LEGACY_TOOLS_UNGUARDED);

export { MCP_READ_LEGACY_TOOLS };
