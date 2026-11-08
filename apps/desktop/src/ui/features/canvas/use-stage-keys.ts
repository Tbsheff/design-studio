import { selectMoveOf } from "@design-studio/contracts";
import type { SelectionContext } from "@design-studio/contracts";
import { useEffect, useRef } from "react";

import { canvasHasKeys } from "../../platform/typing-target.js";
import type { CanvasShell } from "./canvas-shell.js";
import type { Props } from "./canvas-types.js";
import { isTypingTarget } from "./use-pan-zoom.js";
import { PREVIEW_LAYOUT_KEY_EVENT } from "./use-preview-frames.js";
import type { usePreviewFrames } from "./use-preview-frames.js";

const useSelectKey = (
  setSelectMode: (update: (m: boolean) => boolean) => void,
  onEscape: () => void,
  clearSelection: () => boolean
): void => {
  const latest = useRef(clearSelection);
  latest.current = clearSelection;
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
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

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, []);
};

const FIRST_SELECT_KEYS = new Set([
  "ArrowDown",
  "ArrowRight",
  "ArrowUp",
  "ArrowLeft",
]);

const firstSelectKey = (e: KeyboardEvent): boolean => {
  if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) {
    return false;
  }

  return (
    selectMoveOf(e) !== null || (!e.shiftKey && FIRST_SELECT_KEYS.has(e.key))
  );
};

const useFirstSelectKeys = (
  stage: () => HTMLElement | null,
  o: {
    on: boolean;
    empty: boolean;
    picking: boolean;
    selectFirst: () => void;
    startPicking: () => void;
  }
): void => {
  const latest = useRef(o);
  latest.current = o;
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
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

    globalThis.addEventListener("keydown", onKey);

    return (): void => globalThis.removeEventListener("keydown", onKey);
  }, [stage]);
};

const LAYOUT_WAIT_MS = 1500;

const layoutSectionShown = (): boolean => {
  const section = document.querySelector(".ins-layout");

  return Boolean(
    section &&
    !section.closest("[inert]") &&
    section.getClientRects().length > 0
  );
};

const isAddLayoutKey = (e: KeyboardEvent): boolean =>
  e.code === "KeyA" &&
  e.shiftKey &&
  !e.metaKey &&
  !e.ctrlKey &&
  !e.altKey &&
  !e.repeat;

const forwardLayoutKeyWhenShown = (): void => {
  const until = performance.now() + LAYOUT_WAIT_MS;

  const wait = (): void => {
    if (layoutSectionShown()) {
      globalThis.dispatchEvent(new CustomEvent(PREVIEW_LAYOUT_KEY_EVENT));
    } else if (performance.now() < until) {
      globalThis.requestAnimationFrame(wait);
    }
  };

  wait();
};

const useLayoutKeyFallback = (o: {
  on: boolean;
  hasSelection: boolean;
  openEdit: (() => void | Promise<boolean>) | null;
}): void => {
  const latest = useRef(o);
  latest.current = o;
  useEffect(() => {
    const run = (): boolean => {
      const { on, hasSelection, openEdit } = latest.current;

      if (!on || !hasSelection || !openEdit || layoutSectionShown()) {
        return false;
      }

      const forwardWhenOpened = async (): Promise<void> => {
        const moved = await openEdit();

        if (moved !== false) {
          forwardLayoutKeyWhenShown();
        }
      };
      void forwardWhenOpened();

      return true;
    };

    const onKey = (e: KeyboardEvent): void => {
      if (
        isAddLayoutKey(e) &&
        !isTypingTarget(e.target) &&
        canvasHasKeys() &&
        run()
      ) {
        e.preventDefault();
      }
    };

    const onForwarded = (): undefined => void run();
    globalThis.addEventListener("keydown", onKey);
    globalThis.addEventListener(PREVIEW_LAYOUT_KEY_EVENT, onForwarded);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
      globalThis.removeEventListener(PREVIEW_LAYOUT_KEY_EVENT, onForwarded);
    };
  }, []);
};

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

const editOpener = (
  shell: CanvasShell | undefined
): (() => void | Promise<boolean>) | null =>
  shell && shell.pane !== "design" ? () => shell.onPane("design") : null;

const useStageKeys = (o: StageKeys): void => {
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
    hasSelection: o.selection.length > 0,
    on: o.live && !o.running && o.directionId !== null,
    openEdit: editOpener(o.shell),
  });
  useFirstSelectKeys(o.stage, {
    empty: o.selection.length === 0,
    on: o.live && !o.commentMode && !o.protoOn,
    picking: o.picking,
    selectFirst: () =>
      o.post({ type: "select-relative", selector: "", move: "child" }),
    startPicking: () => o.setSelectMode(() => true),
  });
};

const useFrameChange = (
  key: string,
  onChange: (() => void) | undefined
): void => {
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
};

export { useFrameChange, useStageKeys };
