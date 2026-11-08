import { api } from "../../api.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import type { LabelProps } from "./canvas-frames.js";
import { toFrameLabel } from "./frame-label-builder.js";
import { frameLabelSig } from "./frame-label-state.js";
import type { LabelInput, LabelState } from "./frame-label-state.js";
import { useLatestGetter } from "./use-latest-getter.js";

interface FrameLabels {
  (frame: CanvasFrame, did: string | null): LabelProps;
  sig: (frame: CanvasFrame, did: string | null) => string;
}

const loadHtmlPages = async (
  projectId: string,
  did: string
): Promise<string[]> => {
  const { files } = await api.workTreeFiles(projectId, did);

  return files.filter((file) => file.endsWith(".html")).toSorted();
};

const useFrameLabels = (input: LabelInput): FrameLabels => {
  const state: LabelState = { ...input, loadHtmlPages };
  const getLive = useLatestGetter(state);

  const label = (frame: CanvasFrame, did: string | null): LabelProps =>
    toFrameLabel(state, getLive, frame, did);

  const sig = (frame: CanvasFrame, did: string | null): string =>
    frameLabelSig(state, frame, did);

  return Object.assign(label, { sig });
};

export { useFrameLabels };

export type { FrameLabels };
