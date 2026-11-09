import { useEffect, useState } from "react";

import { heldTool } from "../../platform/canvas-tool.js";
import { useLive } from "../../platform/live-store.js";
import { isTypingTarget } from "../../platform/typing-target.js";

interface HeldKeys {
  spaceHeld: boolean;
  zoomHeld: boolean;
}

const isPlainZoomKey = (event: KeyboardEvent): boolean =>
  event.code === "KeyZ" && !event.metaKey && !event.ctrlKey && !event.shiftKey;

const useHeldKeys = (): HeldKeys => {
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [zoomHeld, setZoomHeld] = useState(false);

  useEffect(() => {
    const onDown = (event: KeyboardEvent): void => {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();

        if (!event.repeat) {
          setSpaceHeld(true);
        }

        return;
      }

      if (isPlainZoomKey(event) && !event.repeat) {
        setZoomHeld(true);
      }
    };

    const onUp = (event: KeyboardEvent): void => {
      if (event.code === "Space") {
        setSpaceHeld(false);
      }

      if (event.code === "KeyZ") {
        setZoomHeld(false);
      }
    };

    const onBlur = (): void => {
      setSpaceHeld(false);
      setZoomHeld(false);
    };

    globalThis.addEventListener("keydown", onDown);
    globalThis.addEventListener("keyup", onUp);
    globalThis.addEventListener("blur", onBlur);

    return (): void => {
      globalThis.removeEventListener("keydown", onDown);
      globalThis.removeEventListener("keyup", onUp);
      globalThis.removeEventListener("blur", onBlur);
    };
  }, []);

  const isHand = useLive(heldTool) === "hand";

  return { spaceHeld: spaceHeld || isHand, zoomHeld };
};

export { useHeldKeys };
