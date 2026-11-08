import { selectMoveOf } from "@design-studio/contracts";
import type { SelectionContext } from "@design-studio/contracts";
import { useEffect, useLayoutEffect, useRef } from "react";

import { canvasHasKeys } from "../../platform/typing-target.js";
import type { CanvasShell } from "./canvas-shell.js";
import type { Props } from "./canvas-types.js";
import { isTypingTarget } from "./use-pan-zoom.js";
import { PREVIEW_LAYOUT_KEY_EVENT } from "./use-preview-frames.js";
import type { usePreviewFrames } from "./use-preview-frames.js";

const useSelectKey = (
  setSelectMode: (update: (match: boolean) => boolean) => void,
  onEscape: () => void,
  clearSelection: () => boolean
): void => {
  const latest = useRef(clearSelection);
  useLayoutEffect(() => {
    latest.current = clearSelection;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (
        isTypingTarget(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      if (event.key === "v" || event.key === "V") {
        event.preventDefault();
        setSelectMode((matchValue) => !matchValue);
      } else if (event.key === "Escape") {
        if (
          !event.defaultPrevented &&
          !event.repeat &&
          canvasHasKeys() &&
          latest.current()
        ) {
          return event.preventDefault();
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

const firstSelectKey = (eventValue: KeyboardEvent): boolean => {
  if (
    eventValue.repeat ||
    eventValue.metaKey ||
    eventValue.ctrlKey ||
    eventValue.altKey
  ) {
    return false;
  }

  return (
    selectMoveOf(eventValue) !== null ||
    (!eventValue.shiftKey && FIRST_SELECT_KEYS.has(eventValue.key))
  );
};

const useFirstSelectKeys = (
  stage: () => HTMLElement | null,
  options: {
    on: boolean;
    empty: boolean;
    picking: boolean;
    selectFirst: () => void;
    startPicking: () => void;
  }
): void => {
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });
  useEffect(() => {
    const onKey = (event3: KeyboardEvent): void => {
      const cur = latest.current;

      if (
        !cur.on ||
        !cur.empty ||
        event3.defaultPrevented ||
        document.activeElement !== stage() ||
        !firstSelectKey(event3)
      ) {
        return;
      }

      event3.preventDefault();

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

const isAddLayoutKey = (event4: KeyboardEvent): boolean =>
  event4.code === "KeyA" &&
  event4.shiftKey &&
  !event4.metaKey &&
  !event4.ctrlKey &&
  !event4.altKey &&
  !event4.repeat;

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

const useLayoutKeyFallback = (optionsValue: {
  on: boolean;
  hasSelection: boolean;
  openEdit: (() => void | Promise<boolean>) | null;
}): void => {
  const latest = useRef(optionsValue);
  useLayoutEffect(() => {
    latest.current = optionsValue;
  });
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

    const onKey = (event5: KeyboardEvent): void => {
      if (
        isAddLayoutKey(event5) &&
        !isTypingTarget(event5.target) &&
        canvasHasKeys() &&
        run()
      ) {
        event5.preventDefault();
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
  setSelectMode: (update: (match3: boolean) => boolean) => void;
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
): (() => void | Promise<boolean>) | null => {
  if (shell && shell.pane !== "design") {
    return () => shell.onPane("design");
  }

  return null;
};

const useStageKeys = (stageKeys: StageKeys): void => {
  const selection = useRef(stageKeys.selection);
  useLayoutEffect(() => {
    selection.current = stageKeys.selection;
  });
  const { setSelection } = stageKeys;
  useSelectKey(stageKeys.setSelectMode, stageKeys.offProto, () => {
    if (selection.current.length === 0) {
      return false;
    }

    setSelection(() => []);

    return true;
  });
  useLayoutKeyFallback({
    hasSelection: stageKeys.selection.length > 0,
    on: stageKeys.live && !stageKeys.running && stageKeys.directionId !== null,
    openEdit: editOpener(stageKeys.shell),
  });
  useFirstSelectKeys(stageKeys.stage, {
    empty: stageKeys.selection.length === 0,
    on: stageKeys.live && !stageKeys.commentMode && !stageKeys.protoOn,
    picking: stageKeys.picking,
    selectFirst: () =>
      stageKeys.post({ move: "child", selector: "", type: "select-relative" }),
    startPicking: () => stageKeys.setSelectMode(() => true),
  });
};

const useFrameChange = (
  key: string,
  onChange: (() => void) | undefined
): void => {
  const last = useRef(key);
  const latest = useRef(onChange);
  useLayoutEffect(() => {
    latest.current = onChange;
  });
  useEffect(() => {
    if (last.current === key) {
      return;
    }

    last.current = key;
    latest.current?.();
  }, [key]);
};

export { useFrameChange, useStageKeys };
