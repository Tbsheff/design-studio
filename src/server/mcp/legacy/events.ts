import type { ToolSpec } from "../edit-kit.js";
import { guardTools } from "./guard.js";

const EVENTS_LEGACY_TOOLS_UNGUARDED: ToolSpec[] = [];

const EVENTS_LEGACY_TOOLS = guardTools(EVENTS_LEGACY_TOOLS_UNGUARDED);

export { EVENTS_LEGACY_TOOLS };
