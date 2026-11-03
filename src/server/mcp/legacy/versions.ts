import type { ToolSpec } from "../edit-kit.js";
import { HISTORY_TOOLS } from "../history-tools.js";
import { guardTools } from "./guard.js";

const VERSIONS_LEGACY_TOOLS_UNGUARDED: ToolSpec[] = [...HISTORY_TOOLS];

const VERSIONS_LEGACY_TOOLS = guardTools(VERSIONS_LEGACY_TOOLS_UNGUARDED);

export { VERSIONS_LEGACY_TOOLS };
