import type { McpPoint, ZoomKey } from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ParentMessageBody } from "../../platform/bridge.js";
import { useProjectEvents } from "../../platform/events.js";
import { setFrameHidden } from "./canvas-frames-model.js";
import type { CanvasFrames } from "./use-canvas-frames.js";

const POINT_FRESH_MS = 8000;
const MCP_POINT_MS = 20_000;
const SELECT_AT_MS = [900, 1700];
const ZOOM_AT_MS = 500;

interface PointInput {
  projectId: string;
  frames: CanvasFrames;
  post: (body: ParentMessageBody) => void;
  clearSelection: () => void;
  zoom: (key: ZoomKey) => void;
}

interface McpPointBadge {
  point: McpPoint | null;
  show: () => void;
  dismiss: () => void;
}

const useShowFrame = (
  pointInput: PointInput
): ((frameId: string, selector: string | undefined) => boolean) => {
  const latest = useRef(pointInput);
  latest.current = pointInput;
  const timers = useRef<number[]>([]);
  useEffect(
    () => (): void => {
      timers.current.forEach((target) => window.clearTimeout(target));
    },
    []
  );

  return useCallback(
    (frameId: string, selector: string | undefined): boolean => {
      const cur = latest.current;
      const frame = cur.frames.layout.frames.find(
        (canvasFrame) => canvasFrame.id === frameId
      );

      if (!frame) {
        return false;
      }

      timers.current.forEach((targetValue) => window.clearTimeout(targetValue));

      if (frame.hidden) {
        cur.frames.update((canvasLayout) =>
          setFrameHidden(canvasLayout, frame.id, false)
        );
      }

      cur.frames.activate(frame);
      cur.clearSelection();

      const later = (ms: number, fn: () => void): number =>
        timers.current.push(window.setTimeout(fn, ms));

      later(ZOOM_AT_MS, () => latest.current.zoom("selection"));

      if (selector) {
        for (const ms of SELECT_AT_MS) {
          later(ms, () =>
            latest.current.post({ selector, type: "select-selector" })
          );
        }
      }

      return true;
    },
    []
  );
};

const useCanvasPoint = (pointInputValue: PointInput): McpPointBadge => {
  const showFrame = useShowFrame(pointInputValue);
  const [point, setPoint] = useState<McpPoint | null>(null);
  useProjectEvents(pointInputValue.projectId, (event) => {
    if (
      event.type === "canvas.point" &&
      Date.now() - event.at <= POINT_FRESH_MS
    ) {
      showFrame(event.frameId, event.selector);
    }

    if (
      event.type === "mcp.point" &&
      Date.now() - event.point.at < MCP_POINT_MS
    ) {
      setPoint(event.point);
    }
  });
  useEffect(() => {
    if (!point) {
      return;
    }

    const timer = window.setTimeout(
      () => setPoint(null),
      Math.max(0, point.at + MCP_POINT_MS - Date.now())
    );

    return (): void => window.clearTimeout(timer);
  }, [point]);

  const show = useCallback(() => {
    if (point) {
      showFrame(point.frameId, point.selector);
    }

    setPoint(null);
  }, [point, showFrame]);

  const dismiss = useCallback(() => setPoint(null), []);

  return { dismiss, point, show };
};

export { MCP_POINT_MS, useCanvasPoint };

export type { McpPointBadge };
