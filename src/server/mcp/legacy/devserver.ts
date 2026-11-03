import type { ToolSpec } from "../edit-kit.js";
import { guardTools } from "./guard.js";

const DEVSERVER_LEGACY_TOOLS_UNGUARDED: ToolSpec[] = [];

const DEVSERVER_LEGACY_TOOLS = guardTools(DEVSERVER_LEGACY_TOOLS_UNGUARDED);

export { DEVSERVER_LEGACY_TOOLS };
