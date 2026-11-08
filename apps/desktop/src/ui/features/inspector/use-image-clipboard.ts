import { startTransition, useCallback } from "react";

import { clipboardImage } from "./image-api.js";

type RunImage = (change: Record<string, never>, file: Blob) => Promise<void>;

const CLIPBOARD_EMPTY =
  "The clipboard has no image. Copy an image, then try again.";

const CLIPBOARD_DENIED =
  "The studio cannot read the clipboard. Allow clipboard access, then try again.";

const useImageClipboard = (
  run: RunImage,
  setError: (message: string) => void
): (() => void) =>
  useCallback((): void => {
    startTransition(async () => {
      try {
        const blob = await clipboardImage();

        if (blob) {
          await run({}, blob);
        } else {
          setError(CLIPBOARD_EMPTY);
        }
      } catch {
        setError(CLIPBOARD_DENIED);
      }
    });
  }, [run, setError]);

export { useImageClipboard };
