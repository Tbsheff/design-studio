import type { ToolSpec } from "../edit-kit.js";
import { guardTools } from "./guard.js";

const COMMENTS_LEGACY_TOOLS_UNGUARDED: ToolSpec[] = [];

const COMMENTS_LEGACY_TOOLS = guardTools(COMMENTS_LEGACY_TOOLS_UNGUARDED);

export { COMMENTS_LEGACY_TOOLS };
