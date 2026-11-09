import type { DrawStroke } from "@design-studio/contracts";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { DRAW_POINTS_MAX, DRAW_STROKES_MAX } from "../../../shared/comments.js";
import { useDesktopCommand } from "../../platform/desktop.js";
import { isTypingTarget } from "../../platform/typing-target.js";
import { DRAW_COLORS } from "./drawing-model.js";

interface DrawTool {
  available: boolean;
  on: boolean;
  toolbarMode: boolean | null;
  setOn: (on: boolean) => void;
  toggle: () => void;
  color: string;
  setColor: (color: string) => void;
  strokes: DrawStroke[];
  pointsLeft: number;
  push: (stroke: DrawStroke) => void;
  undo: () => void;
  clear: () => void;
}

const hasText = (target: EventTarget | null): boolean => {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  ) {
    return target.value !== "";
  }

  return isTypingTarget(target);
};

const toToolbarMode = (isAvailable: boolean, isOn: boolean): boolean | null => {
  if (isAvailable) {
    return isOn;
  }

  return null;
};

const hasCommandModifier = (event: KeyboardEvent): boolean =>
  event.metaKey || event.ctrlKey;

const isPlainCommand = (event: KeyboardEvent): boolean =>
  hasCommandModifier(event) && !event.altKey && !event.shiftKey;

const isUndoKey = (event: KeyboardEvent, isActive: boolean): boolean =>
  isActive && isPlainCommand(event) && event.key.toLowerCase() === "z";

const isCloseKey = (key: string): boolean =>
  key === "escape" || key === "v" || key === "c";

interface DrawKeyHandlers {
  readonly toggle: () => void;
  readonly undo: () => void;
  readonly setOn: (on: boolean) => void;
}

const handleDrawKey = (
  event: KeyboardEvent,
  live: { readonly current: { available: boolean; on: boolean } },
  handlers: DrawKeyHandlers
): void => {
  if (isUndoKey(event, live.current.on)) {
    if (!hasText(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      handlers.undo();
    }

    return;
  }

  if (
    isTypingTarget(event.target) ||
    hasCommandModifier(event) ||
    event.altKey
  ) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "p" && !event.shiftKey && live.current.available) {
    event.preventDefault();
    handlers.toggle();

    return;
  }

  if (isCloseKey(key) && live.current.on) {
    handlers.setOn(false);
  }
};

interface DrawStrokes {
  readonly strokes: DrawStroke[];
  readonly undo: () => void;
  readonly clear: () => void;
  readonly push: (stroke: DrawStroke) => void;
}

const useDrawStrokes = (): DrawStrokes => {
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const undo = useCallback(() => setStrokes((prev) => prev.slice(0, -1)), []);
  const clear = useCallback(() => setStrokes([]), []);

  const push = useCallback(
    (stroke: DrawStroke) =>
      setStrokes((prev) => {
        if (prev.length >= DRAW_STROKES_MAX) {
          return prev;
        }

        return [...prev, stroke];
      }),
    []
  );

  return { clear, push, strokes, undo };
};

const useDrawInput = (
  live: { readonly current: { available: boolean; on: boolean } },
  handlers: DrawKeyHandlers
): void => {
  const { setOn, toggle, undo } = handlers;

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void =>
      handleDrawKey(event, live, { setOn, toggle, undo });

    globalThis.addEventListener("keydown", onKey, true);

    return (): void => globalThis.removeEventListener("keydown", onKey, true);
  }, [live, setOn, toggle, undo]);

  useDesktopCommand((command) => {
    if (!live.current.on || command.type !== "undo") {
      return false;
    }

    undo();

    return true;
  });
};

const useDrawTool = (
  available: boolean,
  onActivate: () => void,
  onDeactivate: () => void
): DrawTool => {
  const [isOn, setIsOn] = useState(false);
  const on = isOn;
  const [color, setColor] = useState<string>(DRAW_COLORS[0].value);
  const [wasAvailable, setWasAvailable] = useState(available);
  const { clear, push, strokes, undo } = useDrawStrokes();
  const live = useRef({ available, on, onActivate, onDeactivate });
  useLayoutEffect(() => {
    live.current = { available, on, onActivate, onDeactivate };
  });

  const setOn = useCallback(
    (next: boolean) => {
      if (next && !live.current.available) {
        return;
      }

      if (next) {
        live.current.onActivate();
      } else {
        clear();
      }

      setIsOn(next);
    },
    [clear]
  );

  if (wasAvailable !== available) {
    setWasAvailable(available);

    if (!available) {
      clear();
      setIsOn(false);
    }
  }

  const toggle = useCallback(() => {
    if (live.current.on) {
      live.current.onDeactivate();
    }

    setOn(!live.current.on);
  }, [setOn]);

  useDrawInput(live, { setOn, toggle, undo });

  const used = strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);

  const pointsLeft = Math.max(0, DRAW_POINTS_MAX - used);
  const toolbarMode = toToolbarMode(available, on);

  return {
    available,
    clear,
    color,
    on,
    pointsLeft,
    push,
    setColor,
    setOn,
    strokes,
    toggle,
    toolbarMode,
    undo,
  };
};

const useCanvasDraw = (
  comment: { available: boolean; on: boolean; setOn: (on: boolean) => void },
  selectMode: boolean,
  setSelectMode: (on: boolean) => void
): DrawTool => {
  const setComment = comment.setOn;

  const draw = useDrawTool(
    comment.available,
    () => {
      setSelectMode(false);
      setComment(false);
    },
    () => setSelectMode(true)
  );

  const setDraw = draw.setOn;
  const isBlocked = comment.on || selectMode;
  const [wasBlocked, setWasBlocked] = useState(isBlocked);

  if (wasBlocked !== isBlocked) {
    setWasBlocked(isBlocked);

    if (isBlocked) {
      setDraw(false);
    }
  }

  return draw;
};

export { useCanvasDraw, useDrawTool };

export type { DrawTool };
