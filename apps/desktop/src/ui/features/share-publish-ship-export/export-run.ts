import type {
  ExportFormat,
  ExportFrame,
} from "@design-studio/contracts/export";

import { downloadBlob } from "../../domain/format.js";
import { copy as uiCopy } from "./copy.js";
import { canRevealDownload, exportApi } from "./export-api.js";
import type { ExportTarget } from "./export-api.js";
import { MOBILE_FRAME, MOBILE_MAX } from "./export-formats.js";
import type { ExportStatus } from "./export-formats.js";
import type { ExportOptions } from "./use-export-options.js";

type FileFormat = Exclude<ExportFormat, "handoff">;

const toHandoffFrames = (
  chosen: readonly ExportFrame[]
): readonly ExportFrame[] => {
  if (chosen.some((frame) => frame.width <= MOBILE_MAX)) {
    return chosen;
  }

  return [...chosen, MOBILE_FRAME];
};

const exportOnce = async (
  target: ExportTarget,
  options: ExportOptions
): Promise<ExportStatus> => {
  const selectionFrame =
    options.frames.find((frame) => frame.active)?.frame ?? options.chosen[0];

  const request = {
    format: options.format as FileFormat,
    frames: [...options.chosen],
    scale: options.scale,
    scope: options.scope,
    versionId: target.versionId,
  };

  if (options.isSelectionOnly && target.selector && selectionFrame) {
    const file = await exportApi.exportFile(target.projectId, {
      ...request,
      frames: [selectionFrame],
      selector: target.selector,
    });

    downloadBlob(file.blob, file.name);

    return {
      kind: "done",
      note: file.note,
      reveal: canRevealDownload(),
      text: `Saved ${file.name}`,
    };
  }

  const file = await exportApi.exportFile(target.projectId, request);
  downloadBlob(file.blob, file.name);

  return {
    kind: "done",
    note: file.note,
    reveal: canRevealDownload(),
    text: `Saved ${file.name}`,
  };
};

const MS_PER_SECOND = 1000;

const exportFlowOnce = async (
  target: ExportTarget,
  options: ExportOptions
): Promise<ExportStatus> => {
  const { flow } = options;

  const result = await exportApi.exportFlow(target.projectId, {
    directionId: target.directionId,
    format: flow.videoFormat,
    maxSteps: flow.maxSteps,
    stepMs: flow.stepMs,
  });

  const name = result.path.split("/").at(-1) ?? "";
  const file = await exportApi.getFlowVideo(target.projectId, name);

  downloadBlob(file.blob, file.name);

  return {
    kind: "done",
    note: `${result.steps.length} ${uiCopy.stepsWord}, ${result.durationMs / MS_PER_SECOND} s`,
    reveal: canRevealDownload(),
    text: `Saved ${file.name}`,
  };
};

export { exportFlowOnce, exportOnce, toHandoffFrames };
