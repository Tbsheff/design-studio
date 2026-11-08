import type { SelectionContext } from "@design-studio/contracts";
import { useEffect, useRef } from "react";

import { api } from "../../api.js";
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

const inViewIds = (stage: HTMLElement | null): string[] => {
  if (!stage) {
    return [];
  }

  const box = stage.getBoundingClientRect();
  const ids: string[] = [];

  for (const el of stage.querySelectorAll<HTMLElement>(
    ".artboard[data-frame-id], .canvas-frame[data-frame-id]"
  )) {
    const dOMRect = el.getBoundingClientRect();

    const widthValue =
      Math.min(dOMRect.right, box.right) - Math.max(dOMRect.left, box.left);

    const heightValue =
      Math.min(dOMRect.bottom, box.bottom) - Math.max(dOMRect.top, box.top);

    if (
      widthValue <= 0 ||
      heightValue <= 0 ||
      dOMRect.width <= 0 ||
      dOMRect.height <= 0
    ) {
      continue;
    }

    if (
      (widthValue * heightValue) / (dOMRect.width * dOMRect.height) >=
        WIDTH_VALUE_0_25 ||
      (widthValue * heightValue) / (box.width * box.height) >= WIDTH_VALUE_0_25
    ) {
      ids.push(el.dataset.frameId as string);
    }
  }

  return [...new Set(ids)].sort();
};

const presenceBody = (
  presenceInput: PresenceInput
): {
  activeFrameId: string;
  directionId: string | null;
  inView: string[];
  liveSize: { height: number; width: number };
  selection: { selector: string; tag: string; text: string }[];
} => ({
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

const useCanvasPresence = (presenceInputValue: PresenceInput): void => {
  const latest = useRef(presenceInputValue);
  latest.current = presenceInputValue;
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
      void runOrReport(
        api.putCanvasPresence(latest.current.projectId, body),
        () => {
          last = "";
        }
      );
    };

    send();
    const timer = window.setInterval(send, PRESENCE_MS);

    return (): void => window.clearInterval(timer);
  }, [presenceInputValue.projectId]);
  useEffect(() => {
    let stop: (() => void) | null = null;
    let gone = false;

    const startLive = async (): Promise<void> => {
      const mod = await import("../share-publish-ship-export/share-live.js");

      if (!gone) {
        stop = mod.startShareLive(presenceInputValue.projectId, () =>
          latest.current.stage()
        );
      }
    };

    void startLive();

    return (): void => {
      gone = true;
      stop?.();
    };
  }, [presenceInputValue.projectId]);
};

export { inViewIds, useCanvasPresence };
