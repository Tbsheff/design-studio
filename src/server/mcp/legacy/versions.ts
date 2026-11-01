import type { Version } from "../../../shared/contracts.js";
import { versionName } from "../activity-text.js";
import { loadTarget, refuseWhileRunning, studioCall } from "../edit-deps.js";
import type { EditDeps } from "../edit-deps.js";
import { base, defineTool, ok, versionActivity } from "../edit-kit.js";
import type { Done, ToolSpec } from "../edit-kit.js";
import { HISTORY_TOOLS } from "../history-tools.js";
import { HUNK_TOOLS } from "../hunk-tools.js";
import { VERSION_DIFF_TOOLS } from "../version-diff-tools.js";
import { restoredResult } from "./versions-result.js";
import { restoreVersionSchema } from "./versions-schema.js";
import type { RestoreVersionInput } from "./versions-schema.js";

const restoreVersion = async (
  deps: EditDeps,
  input: RestoreVersionInput
): Promise<Done> => {
  const { project, direction } = await loadTarget(
    deps,
    input.projectId,
    input.directionId
  );

  const version = await deps.versions.get(project, input.versionId);

  refuseWhileRunning(deps, project, direction);

  const restored = await studioCall<Version>(
    deps,
    "POST",
    `${base(project, direction.id)}/restore`,
    { versionId: version.id }
  );

  return {
    activity: versionActivity(
      project,
      direction,
      `Restored “${versionName(version)}”`,
      restored
    ),
    result: ok(restoredResult(restored, version)),
  };
};

const restoreVersionTool = defineTool(
  "restore_version",
  restoreVersionSchema,
  {
    description:
      "Make an older version the current design of a direction. Saved as a new version that undo takes back. The current prototype links and canvas frames stay; only the page files change.",
    destructive: true,
    title: "Restore version",
  },
  restoreVersion
);

const VERSIONS_LEGACY_TOOLS: ToolSpec[] = [
  restoreVersionTool,
  ...HISTORY_TOOLS,
  ...VERSION_DIFF_TOOLS,
  ...HUNK_TOOLS,
];

export { VERSIONS_LEGACY_TOOLS };
