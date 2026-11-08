import type {
  BridgeToParent,
  FreeMoveDrag,
  FreeMoveLine,
  FreeMoveStart,
  SelectionContext,
  StructureEditRequest,
} from "@design-studio/contracts";
import { useEffect, useRef, useState } from "react";

import { api, errorText } from "../../api.js";
import type { ParentMessageBody } from "../../platform/bridge.js";
import { createLiveStore } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import { startOptimistic } from "../inspector/optimistic-edit.js";
import { selectionTargets } from "../inspector/structure-edits.js";
import { buildEditRequest, mergeCommit } from "../inspector/use-direct-edit.js";
import { snapRect } from "./snap-model.js";
import type { Rect, SnapGuide, SpacingBadge } from "./snap-model.js";

interface FreeMoveView {
  box: Rect;
  guides: SnapGuide[];
  spacing: SpacingBadge[];
  line: FreeMoveLine | null;
  copy: boolean;
}

interface Options {
  projectId: string;
  directionId: string | null;
  selection: SelectionContext[];
  enabled: boolean;
  busy: boolean;
  zoom: number;
  post: (body: ParentMessageBody) => void;
  listen: (handler: (message: BridgeToParent) => void) => () => void;
  holdSwap?: (held: boolean, settle: boolean) => void;
  setSelection: (
    updater: (prev: SelectionContext[]) => SelectionContext[]
  ) => void;
  refreshRects: () => void;
  onError: (message: string) => void;
  applyStructure: (request: StructureEditRequest) => Promise<void>;
}

interface Session {
  start: FreeMoveStart;
  target: SelectionContext;
  candidates: Rect[];
}

interface Placed {
  dx: number;
  dy: number;
  view: FreeMoveView;
}

const place = (
  sessionValue: Session,
  drag: FreeMoveDrag,
  zoom: number
): Placed => {
  const base = sessionValue.start.rect;
  const moved = { ...base, x: base.x + drag.dx, y: base.y + drag.dy };
  const absolute = sessionValue.start.mode === "absolute";

  const snapped =
    !absolute || drag.free || sessionValue.candidates.length === 0
      ? { guides: [], rect: moved, spacing: [] }
      : snapRect({
          candidates: sessionValue.candidates,
          rect: moved,
          x: "move",
          y: "move",
          zoom,
        });

  const box = snapped.rect;

  return {
    dx: Math.round(box.x - base.x),
    dy: Math.round(box.y - base.y),
    view: {
      box,
      copy: drag.alt,
      guides: snapped.guides,
      line: drag.insert?.line ?? null,
      spacing: snapped.spacing,
    },
  };
};

const transformOf = (session3: Session, dx: number, dy: number): string => {
  const own =
    session3.start.transform && session3.start.transform !== "none"
      ? ` ${session3.start.transform}`
      : "";

  return `translate(${dx}px, ${dy}px)${own}`;
};

const absoluteStyle = (
  session4: Session,
  dx: number,
  dy: number
): Record<string, string> => {
  const style: Record<string, string> = {};
  const { fromRight, fromBottom } = session4.start;

  if (dx !== 0 || session4.start.convert) {
    style[fromRight ? "right" : "left"] =
      `${Math.round(session4.start.left + (fromRight ? -dx : dx))}px`;
  }

  if (dy !== 0 || session4.start.convert) {
    style[fromBottom ? "bottom" : "top"] =
      `${Math.round(session4.start.top + (fromBottom ? -dy : dy))}px`;
  }

  if (session4.start.convert) {
    Object.assign(style, {
      position: "absolute",
      width: `${Math.round(session4.start.rect.width)}px`,
    });
  }

  return style;
};

const useFreeMove = (options: Options): LiveStore<FreeMoveView | null> => {
  const live = useRef(options);
  live.current = options;
  const session = useRef<Session | null>(null);
  const [view] = useState(() => createLiveStore<FreeMoveView | null>(null));
  const setView = view.set;

  useEffect(() => {
    const end = (committing: boolean): void => {
      if (!session.current) {
        return;
      }

      session.current = null;
      setView(null);
      document.body.classList.remove("element-moving");
      globalThis.removeEventListener("keydown", onKey, true);
      live.current.post({ type: "preview-reset" });
      live.current.holdSwap?.(false, !committing);
    };

    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "Escape" || !session.current) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      live.current.post({ type: "move-cancel" });
      end(false);
    };

    const begin = (start: FreeMoveStart): void => {
      const cur = live.current;
      const target = cur.selection.length === 1 ? cur.selection[0] : undefined;

      if (
        !cur.enabled ||
        !cur.directionId ||
        !target?.source ||
        target.selector !== start.selector
      ) {
        cur.post({ type: "move-cancel" });

        if (
          cur.enabled &&
          !target?.source &&
          target?.selector === start.selector
        ) {
          cur.onError(
            "This element has no source location, so it cannot move here."
          );
        }

        return;
      }

      session.current = {
        candidates: start.parent
          ? [start.parent, ...start.siblings]
          : start.siblings,
        start,
        target,
      };
      document.body.classList.add("element-moving");
      globalThis.addEventListener("keydown", onKey, true);
      cur.holdSwap?.(true, false);
      setView({
        box: start.rect,
        copy: false,
        guides: [],
        line: null,
        spacing: [],
      });
    };

    const update = (drag: FreeMoveDrag): void => {
      const text = session.current;

      if (!text) {
        return;
      }

      const placed = place(text, drag, live.current.zoom);
      live.current.post({
        selector: text.start.selector,
        style: {
          transform: drag.alt
            ? transformOf(text, 0, 0)
            : transformOf(text, placed.dx, placed.dy),
        },
        type: "preview-style",
      });
      setView(placed.view);
    };

    const drop = (drag: FreeMoveDrag): void => {
      const textValue = session.current;

      if (!textValue) {
        return;
      }

      const placed = place(textValue, drag, live.current.zoom);
      const write = commitPlan(textValue, drag, placed);
      end(write !== null);

      if (write) {
        void write();
      }
    };

    const commitPlan = (
      session5: Session,
      drag: FreeMoveDrag,
      placed: Placed
    ): (() => Promise<void>) | null => {
      const cur = live.current;

      if (drag.note || cur.busy) {
        if (drag.note || drag.insert || placed.dx !== 0 || placed.dy !== 0) {
          cur.onError(drag.note ?? "Wait for the last edit to finish.");
        }

        return null;
      }

      const target = selectionTargets([session5.target])?.[0];

      if (!target) {
        return null;
      }

      if (session5.start.mode === "flow") {
        const ref = drag.insert?.ref;

        if (!ref) {
          return null;
        }

        const self = drag.insert?.self
          ? { ...drag.insert.self, selector: target.selector }
          : target;

        return () =>
          cur.applyStructure({
            op: drag.alt ? "duplicate" : "move",
            targets: [self],
            ...(drag.insert?.after ? { after: ref } : { before: ref }),
          });
      }

      if (placed.dx === 0 && placed.dy === 0) {
        return null;
      }

      const style = absoluteStyle(session5, placed.dx, placed.dy);

      if (drag.alt) {
        return () =>
          cur.applyStructure({ op: "duplicate", style, targets: [target] });
      }

      return () => saveStyle(session5.target, style);
    };

    const saveStyle = async (
      target: SelectionContext,
      style: Record<string, string>
    ): Promise<void> => {
      const cur = live.current;
      const req = buildEditRequest(target, style);

      if (!req || !cur.directionId) {
        return;
      }

      const { selector } = target;
      cur.setSelection((prev) => mergeCommit(prev, { selector, style }));

      const optimistic = startOptimistic(
        { post: cur.post, refreshRects: cur.refreshRects },
        req,
        (message) => live.current.onError(message)
      );

      try {
        const result = await api.directEdit(
          cur.projectId,
          cur.directionId,
          req
        );

        optimistic.saved(result.tailwind);
        live.current.refreshRects();
      } catch (error) {
        optimistic.failed(errorText(error));

        const back = Object.fromEntries(
          Object.keys(style).map((key) => [key, target.styles[key] ?? ""])
        );

        live.current.setSelection((prev) =>
          mergeCommit(prev, { selector, style: back })
        );
        live.current.onError(errorText(error));
      }
    };

    const stop = options.listen((message) => {
      if (message.type === "move-start") {
        begin(message.move);
      } else if (message.type === "move-live") {
        update(message.drag);
      } else if (message.type === "move-drop") {
        drop(message.drag);
      } else if (message.type === "move-cancel" || message.type === "ready") {
        end(false);
      }
    });

    return (): void => {
      stop();
      end(false);
    };
  }, [options.listen]);

  return view;
};

export { useFreeMove };

export type { FreeMoveView };
