import { useEffect, useRef } from "react";

import { selectMoveOf } from "../../../shared/contracts.js";
import type { SelectionContext } from "../../../shared/contracts.js";
import { canvasHasKeys } from "../../platform/typing-target.js";
import type { CanvasShell } from "./canvas-shell.js";
import type { Props } from "./canvas-types.js";
import { isTypingTarget } from "./use-pan-zoom.js";
import { PREVIEW_LAYOUT_KEY_EVENT } from "./use-preview-frames.js";
import type { usePreviewFrames } from "./use-preview-frames.js";

function useSelectKey(
  setSelectMode: (update: (m: boolean) => boolean) => void,
  onEscape: () => void,
  clearSelection: () => boolean
) {
  const latest = useRef(clearSelection);
  latest.current = clearSelection;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        setSelectMode((m) => !m);
      } else if (e.key === "Escape") {
        if (
          !e.defaultPrevented &&
          !e.repeat &&
          canvasHasKeys() &&
          latest.current()
        ) {
          return e.preventDefault();
        }

        setSelectMode(() => false);
        onEscape();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

const FIRST_SELECT_KEYS = new Set([
  "ArrowDown",
  "ArrowRight",
  "ArrowUp",
  "ArrowLeft",
]);

function firstSelectKey(e: KeyboardEvent): boolean {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) {
    return false;
  }

  return (
    selectMoveOf(e) !== null || (!e.shiftKey && FIRST_SELECT_KEYS.has(e.key))
  );
}

function useFirstSelectKeys(
  stage: () => HTMLElement | null,
  o: {
    on: boolean;
    empty: boolean;
    picking: boolean;
    selectFirst: () => void;
    startPicking: () => void;
  }
) {
  const latest = useRef(o);
  latest.current = o;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cur = latest.current;

      if (
        !cur.on ||
        !cur.empty ||
        e.defaultPrevented ||
        document.activeElement !== stage() ||
        !firstSelectKey(e)
      ) {
        return;
      }

      e.preventDefault();

      if (!cur.picking) {
        cur.startPicking();
      }

      cur.selectFirst();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [stage]);
}

const LAYOUT_WAIT_MS = 1500;

function layoutSectionShown(): boolean {
  const section = document.querySelector(".ins-layout");

  return Boolean(
    section &&
    !section.closest("[inert]") &&
    section.getClientRects().length > 0
  );
}

function isAddLayoutKey(e: KeyboardEvent): boolean {
  return (
    e.code === "KeyA" &&
    e.shiftKey &&
    !e.metaKey &&
    !e.ctrlKey &&
    !e.altKey &&
    !e.repeat
  );
}

function forwardLayoutKeyWhenShown(): void {
  const until = performance.now() + LAYOUT_WAIT_MS;

  const wait = () => {
    if (layoutSectionShown()) {
      window.dispatchEvent(new CustomEvent(PREVIEW_LAYOUT_KEY_EVENT));
    } else if (performance.now() < until) {
      window.requestAnimationFrame(wait);
    }
  };

  wait();
}

function useLayoutKeyFallback(o: {
  on: boolean;
  hasSelection: boolean;
  openEdit: (() => void | Promise<boolean>) | null;
}) {
  const latest = useRef(o);
  latest.current = o;
  useEffect(() => {
    const run = (): boolean => {
      const { on, hasSelection, openEdit } = latest.current;

      if (!on || !hasSelection || !openEdit || layoutSectionShown()) {
        return false;
      }

      void Promise.resolve(openEdit()).then((moved) => {
        if (moved !== false) {
          forwardLayoutKeyWhenShown();
        }
      });

      return true;
    };

    const onKey = (e: KeyboardEvent) => {
      if (
        isAddLayoutKey(e) &&
        !isTypingTarget(e.target) &&
        canvasHasKeys() &&
        run()
      ) {
        e.preventDefault();
      }
    };

    const onForwarded = () => void run();
    window.addEventListener("keydown", onKey);
    window.addEventListener(PREVIEW_LAYOUT_KEY_EVENT, onForwarded);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(PREVIEW_LAYOUT_KEY_EVENT, onForwarded);
    };
  }, []);
}

interface StageKeys {
  stage: () => HTMLElement | null;
  selection: SelectionContext[];
  setSelection: Props["setSelection"];
  setSelectMode: (update: (m: boolean) => boolean) => void;
  offProto: () => void;
  post: ReturnType<typeof usePreviewFrames>["post"];
  shell: CanvasShell | undefined;
  picking: boolean;
  live: boolean;
  running: boolean | undefined;
  directionId: string | null;
  commentMode: boolean;
  protoOn: boolean;
}

function editOpener(
  shell: CanvasShell | undefined
): (() => void | Promise<boolean>) | null {
  return shell && shell.pane !== "design" ? () => shell.onPane("design") : null;
}

function useStageKeys(o: StageKeys) {
  const selection = useRef(o.selection);
  selection.current = o.selection;
  const { setSelection } = o;
  useSelectKey(o.setSelectMode, o.offProto, () => {
    if (selection.current.length === 0) {
      return false;
    }

    setSelection(() => []);

    return true;
  });
  useLayoutKeyFallback({
    on: o.live && !o.running && o.directionId !== null,
    hasSelection: o.selection.length > 0,
    openEdit: editOpener(o.shell),
  });
  useFirstSelectKeys(o.stage, {
    on: o.live && !o.commentMode && !o.protoOn,
    empty: o.selection.length === 0,
    picking: o.picking,
    selectFirst: () =>
      o.post({ type: "select-relative", selector: "", move: "child" }),
    startPicking: () => o.setSelectMode(() => true),
  });
}

function useFrameChange(key: string, onChange: (() => void) | undefined) {
  const last = useRef(key);
  const latest = useRef(onChange);
  latest.current = onChange;
  useEffect(() => {
    if (last.current === key) {
      return;
    }

    last.current = key;
    latest.current?.();
  }, [key]);
}

export { useFrameChange, useStageKeys };
