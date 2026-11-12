import { selectMoveOf } from "@design-studio/contracts";
import type { SelectionContext } from "@design-studio/contracts";
import { useEffect, useLayoutEffect, useRef } from "react";

import { canTakeCanvasKeys } from "../../platform/canvas-focus.js";
import { heldTool } from "../../platform/canvas-tool.js";
import { findElement } from "../../platform/find-element.js";
import { focusStageQuietly } from "../../platform/focus.js";
import { canvasHasKeys, isTextField } from "../../platform/typing-target.js";
import type { CanvasShell } from "./canvas-shell.js";
import type { Props } from "./canvas-types.js";
import { isTypingTarget } from "./use-pan-zoom.js";
import { PREVIEW_LAYOUT_KEY_EVENT } from "./use-preview-frames.js";
import type { usePreviewFrames } from "./use-preview-frames.js";
import { vectorTool } from "./vector-tool-model.js";

type SetSelectMode = (update: (match: boolean) => boolean) => void;

interface SelectKeyHandlers {
  readonly setSelectMode: SetSelectMode;
  readonly onEscape: () => void;
  readonly clearSelection: () => boolean;
}

const hasCommandModifier = (event: KeyboardEvent): boolean =>
  event.metaKey || event.ctrlKey || event.altKey;

const isSelectToggleKey = (event: KeyboardEvent): boolean =>
  event.key === "v" || event.key === "V";

const isEscapeConsumed = (
  event: KeyboardEvent,
  clearSelection: () => boolean
): boolean =>
  !event.defaultPrevented &&
  !event.repeat &&
  canvasHasKeys() &&
  clearSelection();

const routeSelectKey = (
  event: KeyboardEvent,
  handlers: SelectKeyHandlers
): void => {
  if (isTextField(event.target) || hasCommandModifier(event)) {
    return;
  }

  if (isSelectToggleKey(event)) {
    event.preventDefault();
    heldTool.set(null);
    vectorTool.set(null);
    handlers.setSelectMode(() => true);

    return;
  }

  if (event.key !== "Escape" || isTypingTarget(event.target)) {
    return;
  }

  if (isEscapeConsumed(event, handlers.clearSelection)) {
    event.preventDefault();

    return;
  }

  heldTool.set(null);
  handlers.setSelectMode(() => true);
  handlers.onEscape();
};

const useSelectKey = (
  setSelectMode: SetSelectMode,
  onEscape: () => void,
  clearSelection: () => boolean
): void => {
  const latest = useRef<SelectKeyHandlers>({
    clearSelection,
    onEscape,
    setSelectMode,
  });

  useLayoutEffect(() => {
    latest.current = { clearSelection, onEscape, setSelectMode };
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void =>
      routeSelectKey(event, latest.current);

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

const isPlainArrow = (event: KeyboardEvent): boolean =>
  !event.shiftKey && FIRST_SELECT_KEYS.has(event.key);

const firstSelectKey = (eventValue: KeyboardEvent): boolean => {
  if (eventValue.repeat || hasCommandModifier(eventValue)) {
    return false;
  }

  return selectMoveOf(eventValue) !== null || isPlainArrow(eventValue);
};

const isFirstSelectFocus = (
  event: KeyboardEvent,
  isOnStage: boolean
): boolean => isOnStage || (isPlainArrow(event) && canTakeCanvasKeys());

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

      if (!cur.on || !cur.empty || event3.defaultPrevented) {
        return;
      }

      const target = stage();
      const isOnStage = document.activeElement === target;

      if (!firstSelectKey(event3) || !isFirstSelectFocus(event3, isOnStage)) {
        return;
      }

      event3.preventDefault();

      if (!isOnStage) {
        focusStageQuietly(target);
      }

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
  const section = findElement(document.body, ".ins-layout");

  if (!section || section.closest("[inert]")) {
    return false;
  }

  return section.getClientRects().length > 0;
};

const isAddLayoutKey = (event4: KeyboardEvent): boolean =>
  event4.code === "KeyA" &&
  event4.shiftKey &&
  !hasCommandModifier(event4) &&
  !event4.repeat;

const forwardLayoutKeyWhenShown = (): void => {
  const until = performance.now() + LAYOUT_WAIT_MS;

  const wait = (): void => {
    if (layoutSectionShown()) {
      globalThis.dispatchEvent(new CustomEvent(PREVIEW_LAYOUT_KEY_EVENT));

      return;
    }

    if (performance.now() < until) {
      globalThis.requestAnimationFrame(wait);
    }
  };

  wait();
};

type OpenEdit = () => ReturnType<CanvasShell["onInspector"]>;

const useLayoutKeyFallback = (optionsValue: {
  on: boolean;
  hasSelection: boolean;
  openEdit: OpenEdit | null;
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

    const onForwarded = (): void => {
      run();
    };

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

const editOpener = (shell: CanvasShell | undefined): OpenEdit | null => {
  if (shell && !shell.isInspectorOpen) {
    return shell.onInspector;
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
