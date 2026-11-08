import type { SelectionContext } from "@design-studio/contracts";
import { useEffect, useRef } from "react";

import { api } from "../../api.js";
import { runOrReport } from "./settle-model.js";

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
    const r = el.getBoundingClientRect();
    const w = Math.min(r.right, box.right) - Math.max(r.left, box.left);
    const h = Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top);

    if (w <= 0 || h <= 0 || r.width <= 0 || r.height <= 0) {
      continue;
    }

    if (
      (w * h) / (r.width * r.height) >= 0.25 ||
      (w * h) / (box.width * box.height) >= 0.25
    ) {
      ids.push(el.dataset.frameId as string);
    }
  }

  return [...new Set(ids)].sort();
};

const presenceBody = (o: PresenceInput) => ({
  activeFrameId: o.activeId,
  directionId: o.directionId,
  inView: inViewIds(o.stage()),
  liveSize: {
    height: Math.round(o.liveSize.height),
    width: Math.round(o.liveSize.width),
  },
  selection: o.selection.slice(0, 20).map((s) => ({
    selector: s.selector.slice(0, 400),
    tag: s.tag.slice(0, 40),
    text: s.text.slice(0, 200),
  })),
});

const useCanvasPresence = (o: PresenceInput): void => {
  const latest = useRef(o);
  latest.current = o;
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
  }, [o.projectId]);
  useEffect(() => {
    let stop: (() => void) | null = null;
    let gone = false;

    const startLive = async (): Promise<void> => {
      const mod = await import("../share-publish-ship-export/share-live.js");

      if (!gone) {
        stop = mod.startShareLive(o.projectId, () => latest.current.stage());
      }
    };

    void startLive();

    return (): void => {
      gone = true;
      stop?.();
    };
  }, [o.projectId]);
};

export { inViewIds, useCanvasPresence };
