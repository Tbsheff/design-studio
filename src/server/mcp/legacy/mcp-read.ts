import { CONTEXT_TOOLS } from "../context-tools.js";
import { DOCTOR_TOOLS } from "../doctor-tools.js";
import type { ToolSpec } from "../edit-kit.js";
import { PORT_TOOLS } from "../port-tools.js";
import { USAGE_TOOLS } from "../usage-tools.js";

const MCP_READ_LEGACY_TOOLS: ToolSpec[] = [
  ...CONTEXT_TOOLS,
  ...DOCTOR_TOOLS,
  ...PORT_TOOLS,
  ...USAGE_TOOLS,
];

export { MCP_READ_LEGACY_TOOLS };
