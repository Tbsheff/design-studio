import type { ToolSpec } from "../edit-kit.js";
import { guardTools } from "./guard.js";

const CLOUD_LEGACY_TOOLS_UNGUARDED: ToolSpec[] = [];

const CLOUD_LEGACY_TOOLS = guardTools(CLOUD_LEGACY_TOOLS_UNGUARDED);

export { CLOUD_LEGACY_TOOLS };
