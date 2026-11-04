import { useEffect, useRef } from "react";

import { isTypingTarget } from "../../platform/typing-target.js";
import { imageFileOf } from "./image-api.js";

const usePasteImage = (enabled: boolean, onImage: (file: File) => void) => {
  const live = useRef(onImage);
  live.current = onImage;
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onPaste = (event: ClipboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      const file = imageFileOf(event.clipboardData?.items);

      if (!file) {
        return;
      }

      event.preventDefault();
      live.current(file);
    };

    document.addEventListener("paste", onPaste);

    return () => document.removeEventListener("paste", onPaste);
  }, [enabled]);
};

export { usePasteImage };
