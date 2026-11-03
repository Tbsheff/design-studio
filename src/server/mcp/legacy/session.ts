import type { ToolSpec } from "../edit-kit.js";
import { guardTools } from "./guard.js";

const SESSION_LEGACY_TOOLS_UNGUARDED: ToolSpec[] = [];

const SESSION_LEGACY_TOOLS = guardTools(SESSION_LEGACY_TOOLS_UNGUARDED);

export { SESSION_LEGACY_TOOLS };
