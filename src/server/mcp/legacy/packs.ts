import {
  loadTarget,
  oneLine,
  refuseWhileRunning,
  studioCall,
} from "../edit-deps.js";
import type { EditDeps } from "../edit-deps.js";
import { base, defineTool, ok, versionActivity } from "../edit-kit.js";
import type { Done, ToolSpec } from "../edit-kit.js";
import { guardTools } from "./guard.js";
import { openFolderTool } from "./open-folder.js";
import { packOf } from "./pack-of.js";
import { appliedResult } from "./packs-result.js";
import type { ApplyResult } from "./packs-result.js";
import { applyDesignSystemSchema } from "./packs-schema.js";
import type { ApplyDesignSystemInput } from "./packs-schema.js";

const NAME_TEXT_MAX = 60;

const applyDesignSystem = async (
  deps: EditDeps,
  input: ApplyDesignSystemInput
): Promise<Done> => {
  const { project, direction } = await loadTarget(
    deps,
    input.projectId,
    input.directionId
  );

  const packLookup = packOf(deps, input.packId);

  const pack = await packLookup;

  refuseWhileRunning(deps, project, direction);

  const result = await studioCall<ApplyResult>(
    deps,
    "POST",
    `${base(project, direction.id)}/design-system/apply`,
    { packId: pack.id }
  );

  return {
    activity: versionActivity(
      project,
      direction,
      `Applied ${oneLine(pack.name, NAME_TEXT_MAX)}`,
      result.version
    ),
    result: ok(appliedResult(pack.id, result)),
  };
};

const applyDesignSystemTool = defineTool(
  "apply_design_system",
  applyDesignSystemSchema,
  {
    description:
      "Apply a design system to a direction. This overwrites the tokens, tokens.css and DESIGN.md (project notes stay) as one new version.",
    destructive: true,
    title: "Apply design system",
  },
  applyDesignSystem
);

const PACKS_LEGACY_TOOLS_UNGUARDED: ToolSpec[] = [
  applyDesignSystemTool,
  openFolderTool,
];

const PACKS_LEGACY_TOOLS = guardTools(PACKS_LEGACY_TOOLS_UNGUARDED);

export { PACKS_LEGACY_TOOLS };
