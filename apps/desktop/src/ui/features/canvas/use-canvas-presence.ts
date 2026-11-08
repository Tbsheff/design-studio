import type { SelectionContext } from "@design-studio/contracts";
import { useEffect, useLayoutEffect, useRef } from "react";

import { api } from "../../api.js";
import { findElements } from "../../platform/find-element.js";
import { startInterval } from "../../platform/interval.js";
import type { startShareLive } from "../share-publish-ship-export/share-live.js";
import { runOrReport } from "./settle-model.js";

const WIDTH_VALUE_0_25 = 0.25;

const SLICE_20 = 20;

const SLICE_400 = 400;

const SLICE_40 = 40;

const SLICE_200 = 200;

const PRESENCE_MS = 1500;
const RESEND_MS = 60_000;

interface PresenceInput {
  projectId: string;
  directionId: string | null;
  activeId: string;
  liveSize: { width: number; height: number };
  selection: SelectionContext[];
  stage: () => HTMLElement | null;
}

const isFrameInView = (frame: HTMLElement, box: DOMRect): boolean => {
  const rect = frame.getBoundingClientRect();

  const widthValue =
    Math.min(rect.right, box.right) - Math.max(rect.left, box.left);

  const heightValue =
    Math.min(rect.bottom, box.bottom) - Math.max(rect.top, box.top);

  if (
    widthValue <= 0 ||
    heightValue <= 0 ||
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    return false;
  }

  return (
    (widthValue * heightValue) / (rect.width * rect.height) >=
      WIDTH_VALUE_0_25 ||
    (widthValue * heightValue) / (box.width * box.height) >= WIDTH_VALUE_0_25
  );
};

const inViewIds = (stage: HTMLElement | null): string[] => {
  if (!stage) {
    return [];
  }

  const box = stage.getBoundingClientRect();
  const ids: string[] = [];

  for (const frame of findElements(
    stage,
    ".artboard[data-frame-id], .canvas-frame[data-frame-id]"
  )) {
    if (isFrameInView(frame, box)) {
      ids.push(frame.dataset.frameId as string);
    }
  }

  return [...new Set(ids)].toSorted();
};

interface PresenceBody {
  readonly activeFrameId: string;
  readonly directionId: string | null;
  readonly inView: string[];
  readonly liveSize: { readonly height: number; readonly width: number };
  readonly selection: {
    readonly selector: string;
    readonly tag: string;
    readonly text: string;
  }[];
}

const presenceBody = (presenceInput: PresenceInput): PresenceBody => ({
  activeFrameId: presenceInput.activeId,
  directionId: presenceInput.directionId,
  inView: inViewIds(presenceInput.stage()),
  liveSize: {
    height: Math.round(presenceInput.liveSize.height),
    width: Math.round(presenceInput.liveSize.width),
  },
  selection: presenceInput.selection
    .slice(0, SLICE_20)
    .map((selectionContext) => ({
      selector: selectionContext.selector.slice(0, SLICE_400),
      tag: selectionContext.tag.slice(0, SLICE_40),
      text: selectionContext.text.slice(0, SLICE_200),
    })),
});

interface ShareLiveModule {
  readonly startShareLive: typeof startShareLive;
}

const loadShareLive = (): Promise<ShareLiveModule> =>
  import("../share-publish-ship-export/share-live.js");

const useCanvasPresence = (presenceInputValue: PresenceInput): void => {
  const { projectId } = presenceInputValue;
  const latest = useRef(presenceInputValue);
  useLayoutEffect(() => {
    latest.current = presenceInputValue;
  });
  useEffect(() => {
    let last = "";
    let sentAt = 0;

    const send = (): void => {
      if (document.hidden) {
        return;
      }

      const body = presenceBody(latest.current);
      const key = JSON.stringify(body);

      if (key === last && Date.now() - sentAt < RESEND_MS) {
        return;
      }

      last = key;
      sentAt = Date.now();
      void runOrReport(api.putCanvasPresence(projectId, body), () => {
        last = "";
      });
    };

    send();

    return startInterval(send, PRESENCE_MS);
  }, [projectId]);
  useEffect(() => {
    let stop: (() => void) | null = null;
    let gone = false;

    const startLive = async (): Promise<void> => {
      const mod = await loadShareLive();

      if (!gone) {
        stop = mod.startShareLive(projectId, () => latest.current.stage());
      }
    };

    void startLive();

    return (): void => {
      gone = true;
      stop?.();
    };
  }, [projectId]);
};

export { inViewIds, useCanvasPresence };
