import type { SharePresenceEvent } from "@design-studio/contracts/share";

import { getRaw } from "../../platform/http.js";
import {
  onSharePointer,
  setSharePointer,
} from "../design-system/token-frames.js";
import { SHARES_CHANGED } from "./share-api.js";
import { createCursorLayer } from "./share-cursor-layer.js";
import type { CursorLayer } from "./share-cursor-layer.js";
import { readEvents } from "./share-presence-stream.js";
import { createStudioPointer } from "./share-studio-pointer.js";
import type { PointerBridge, StudioPointer } from "./share-studio-pointer.js";

const RETRY_MS = 5000;

const POINTER_BRIDGE: PointerBridge = {
  onFrame: onSharePointer,
  setPointer: setSharePointer,
};

interface LiveState {
  control: AbortController | null;
  retry: ReturnType<typeof globalThis.setTimeout> | null;
  stopped: boolean;
}

const applyEvent = (
  layer: CursorLayer,
  pointer: StudioPointer,
  event: SharePresenceEvent
): void => {
  if (event.type === "state") {
    layer.set(event.cursors);
    pointer.set(event.wantCursor);
  }

  if (event.type === "cursor") {
    layer.put(event.cursor);
  }

  if (event.type === "leave") {
    layer.drop(event.linkId, event.viewer);
  }
};

const isChangedFor = (event: Event, projectId: string): boolean =>
  event instanceof CustomEvent &&
  new Map(Object.entries(event.detail ?? {})).get("projectId") === projectId;

const startShareLive = (
  projectId: string,
  stage: () => HTMLElement | null
): (() => void) => {
  const layer = createCursorLayer(stage);
  const pointer = createStudioPointer(projectId, stage, POINTER_BRIDGE);
  const state: LiveState = { control: null, retry: null, stopped: false };

  const listen = async (
    own: AbortController,
    reconnect: () => void
  ): Promise<void> => {
    try {
      const response = await getRaw(
        `/api/projects/${encodeURIComponent(projectId)}/share-presence`,
        own.signal
      );

      if (response.ok) {
        await readEvents(response, (event) => {
          applyEvent(layer, pointer, event);
        });
      }
    } catch {
      own.abort();
    } finally {
      if (state.control === own && !state.stopped) {
        layer.set([]);
        pointer.set(false);
        state.retry = globalThis.setTimeout(reconnect, RETRY_MS);
      }
    }
  };

  const connect = (): void => {
    if (state.retry !== null) {
      globalThis.clearTimeout(state.retry);
    }

    state.control?.abort();

    if (state.stopped) {
      return;
    }

    const own = new AbortController();
    state.control = own;
    void listen(own, connect);
  };

  const handleChanged = (event: Event): void => {
    if (isChangedFor(event, projectId)) {
      connect();
    }
  };

  globalThis.addEventListener(SHARES_CHANGED, handleChanged);
  connect();

  return (): void => {
    state.stopped = true;
    globalThis.removeEventListener(SHARES_CHANGED, handleChanged);

    if (state.retry !== null) {
      globalThis.clearTimeout(state.retry);
    }

    state.control?.abort();
    pointer.set(false);
    layer.destroy();
  };
};

export { startShareLive };
