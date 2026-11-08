import {
  activeFrame,
  canvasStore,
  defaultLayout,
} from "../../features/canvas/index";
import { uiStore } from "../../platform/storage";

interface DevStatusFrame {
  id: string;
  label: string | null;
  path: string | null;
}

interface DevStatusRequest {
  frames: DevStatusFrame[];
  markFrameId: string | null;
}

const toDevStatusRequest = (
  projectId: string,
  isMark: boolean
): DevStatusRequest => {
  const layout =
    canvasStore.get(projectId) ?? defaultLayout(uiStore.get().viewport);

  const frames = layout.frames.map((frame) => ({
    id: frame.id,
    label: frame.label ?? null,
    path: frame.path ?? null,
  }));

  if (!isMark) {
    return { frames, markFrameId: null };
  }

  return { frames, markFrameId: activeFrame(layout).id };
};

export { toDevStatusRequest };

export type { DevStatusFrame, DevStatusRequest };
