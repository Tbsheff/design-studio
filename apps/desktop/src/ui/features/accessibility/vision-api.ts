import type { AccessibilityIds } from "./accessibility-api.js";
import { api, call, accessibilityRoutes, projectRoutes } from "./deps.js";
import { toFrameId, toProjectFilePath } from "./vision-model.js";
import type { VisionKind, VisionReport } from "./vision-model.js";

interface VisionResult {
  readonly report: VisionReport;
  readonly sheetUrl: string;
}

const NO_FRAME = "This direction has no frame to simulate.";

const readFrameId = async (ids: AccessibilityIds): Promise<string> => {
  const snapshot = await api.getCanvas(ids.projectId);
  const frameId = toFrameId(snapshot.canvas?.frames ?? [], ids.directionId);

  if (frameId === null) {
    throw new Error(NO_FRAME);
  }

  return frameId;
};

const runVision = async (
  ids: AccessibilityIds,
  kinds: readonly VisionKind[]
): Promise<VisionResult> => {
  const frame = await readFrameId(ids);

  const report = await call(accessibilityRoutes.runVisionAccessibility, {
    directionId: ids.directionId,
    frameId: frame,
    kinds: [...kinds],
    layer: null,
    projectId: ids.projectId,
  });

  const file = await call(projectRoutes.getFileProject, {
    path: toProjectFilePath(report.sheetPath),
    projectId: ids.projectId,
  });

  return { report, sheetUrl: `data:${file.mimeType};base64,${file.data}` };
};

export { runVision };

export type { VisionResult };
