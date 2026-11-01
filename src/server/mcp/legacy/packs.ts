import type { Version } from "../../../shared/contracts.js";
import {
  loadTarget,
  oneLine,
  refuseWhileRunning,
  studioCall,
} from "../edit-deps.js";
import type { EditDeps } from "../edit-deps.js";
import { base, defineTool, ok, versionActivity } from "../edit-kit.js";
import type { Done, ToolSpec } from "../edit-kit.js";
import { LIBRARY_TOOLS } from "../library-tools.js";
import { packOf } from "./pack-of.js";
import { applyDesignSystemSchema } from "./packs-schema.js";
import type { ApplyDesignSystemInput } from "./packs-schema.js";

interface ApplyResult {
  version: Version | null;
  notice: string | null;
}

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
    result: ok({
      applied: pack.id,
      changedFiles: result.version?.changedFiles ?? [],
      notice: result.notice,
      versionId: result.version?.id ?? null,
    }),
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

const PACKS_LEGACY_TOOLS: ToolSpec[] = [
  applyDesignSystemTool,
  ...LIBRARY_TOOLS,
];

export { PACKS_LEGACY_TOOLS };
