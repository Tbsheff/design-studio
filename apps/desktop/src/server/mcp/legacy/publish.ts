import type { ToolSpec } from "../edit-kit.js";
import { guardTools } from "./guard.js";

const PUBLISH_LEGACY_TOOLS_UNGUARDED: ToolSpec[] = [];

const PUBLISH_LEGACY_TOOLS = guardTools(PUBLISH_LEGACY_TOOLS_UNGUARDED);

export { PUBLISH_LEGACY_TOOLS };
