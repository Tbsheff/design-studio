import type { ToolSpec } from "../edit-kit.js";
import { guardTools } from "./guard.js";

const RUNS_LEGACY_TOOLS_UNGUARDED: ToolSpec[] = [];

const RUNS_LEGACY_TOOLS = guardTools(RUNS_LEGACY_TOOLS_UNGUARDED);

export { RUNS_LEGACY_TOOLS };
