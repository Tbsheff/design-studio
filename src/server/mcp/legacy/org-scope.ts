import type { ToolSpec } from "../edit-kit.js";
import { guardTools } from "./guard.js";

const ORG_SCOPE_LEGACY_TOOLS_UNGUARDED: ToolSpec[] = [];

const ORG_SCOPE_LEGACY_TOOLS = guardTools(ORG_SCOPE_LEGACY_TOOLS_UNGUARDED);

export { ORG_SCOPE_LEGACY_TOOLS };
