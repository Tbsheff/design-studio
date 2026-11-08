import type { ToolSpec } from "../edit-kit.js";
import { guardTools } from "./guard.js";
import { openFolderTool } from "./open-folder.js";

const PACKS_LEGACY_TOOLS_UNGUARDED: ToolSpec[] = [openFolderTool];

const PACKS_LEGACY_TOOLS = guardTools(PACKS_LEGACY_TOOLS_UNGUARDED);

export { PACKS_LEGACY_TOOLS };
