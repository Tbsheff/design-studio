import { useEffect } from "react";

import { useDesktopCommand } from "../../platform/desktop.js";
import { editsText } from "../../platform/typing-target.js";
import { useLatest } from "../../platform/use-latest.js";
import { PREVIEW_HISTORY_EVENT, historyKeyOf } from "./use-undo-shortcut.js";

const useUndoDismiss = (isShown: boolean, onDismiss: () => void): void => {
  const dismiss = useLatest(onDismiss);

  useEffect(() => {
    if (!isShown) {
      return;
    }

    const onKey = (event: KeyboardEvent): void => {
      if (historyKeyOf(event) === "undo" && !editsText(event.target)) {
        dismiss.current();
      }
    };

    const fromPreview = (event: Event): void => {
      if (!(event instanceof CustomEvent) || event.detail?.redo !== true) {
        dismiss.current();
      }
    };

    globalThis.addEventListener("keydown", onKey, true);
    globalThis.addEventListener(PREVIEW_HISTORY_EVENT, fromPreview);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey, true);
      globalThis.removeEventListener(PREVIEW_HISTORY_EVENT, fromPreview);
    };
  }, [dismiss, isShown]);

  useDesktopCommand((command) => {
    if (
      isShown &&
      command.type === "undo" &&
      !editsText(document.activeElement)
    ) {
      dismiss.current();
    }

    return false;
  });
};

export { useUndoDismiss };
