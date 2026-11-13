import { createLiveStore } from "../../platform/live-store.js";

interface FrameZoomRequest {
  readonly ids: readonly string[];
  readonly projectId: string;
}

const frameZoomStore = createLiveStore<FrameZoomRequest | null>(null);

const requestFrameZoom = (projectId: string, ids: readonly string[]): void =>
  frameZoomStore.set({ ids, projectId });

const clearFrameZoom = (): void => frameZoomStore.set(null);

export { clearFrameZoom, frameZoomStore, requestFrameZoom };

export type { FrameZoomRequest };
