import type { ToolSpec } from "../edit-kit.js";
import { guardTools } from "./guard.js";

const STUDIO_LEGACY_TOOLS_UNGUARDED: ToolSpec[] = [];

const STUDIO_LEGACY_TOOLS = guardTools(STUDIO_LEGACY_TOOLS_UNGUARDED);

export { STUDIO_LEGACY_TOOLS };
