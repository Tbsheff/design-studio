import { useEffect, useRef } from "react";

import { isTypingTarget } from "../../platform/typing-target.js";
import { toImageFile } from "./use-image-api.js";

const usePasteImage = (
  enabled: boolean,
  onImage: (file: File) => void
): void => {
  const live = useRef(onImage);
  useEffect(() => {
    live.current = onImage;
  });
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onPaste = (event: ClipboardEvent): void => {
      if (isTypingTarget(event.target)) {
        return;
      }

      const file = toImageFile(event.clipboardData?.items ?? null);

      if (!file) {
        return;
      }

      event.preventDefault();
      live.current(file);
    };

    document.addEventListener("paste", onPaste);

    return (): void => document.removeEventListener("paste", onPaste);
  }, [enabled]);
};

export { usePasteImage };
