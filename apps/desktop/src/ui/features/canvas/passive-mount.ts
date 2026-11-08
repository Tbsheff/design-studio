import { useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";

import { PREVIEW_PAINTED_EVENT } from "../../platform/preview-painted.js";

const MOUNT_FALLBACK_MS = 1200;

let frontPainted = false;

let paintListening = false;

const resetPassiveMountGate = (): boolean => {
  const wasListening = paintListening;
  frontPainted = false;

  if (!wasListening) {
    paintListening = true;
    globalThis.addEventListener(PREVIEW_PAINTED_EVENT, () => {
      frontPainted = true;
    });
  }

  return wasListening;
};

const useResetPassiveGateInFirstRender = (): boolean =>
  useMemo(() => resetPassiveMountGate(), []);

const usePassiveMount = (ref: RefObject<HTMLDivElement | null>): boolean => {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const el = ref.current;

    if (armed || !el) {
      return;
    }

    let front = frontPainted;
    let seen = false;

    const tryArm = (): void => {
      if (front && seen) {
        setArmed(true);
      }
    };

    const onPaint = (): void => {
      front = true;
      tryArm();
    };

    globalThis.addEventListener(PREVIEW_PAINTED_EVENT, onPaint);
    const timer = globalThis.setTimeout(onPaint, MOUNT_FALLBACK_MS);
    const root = el.closest(".stage");

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((event) => event.isIntersecting)) {
          return;
        }

        seen = true;
        tryArm();
      },
      { root, rootMargin: "50%" }
    );

    io.observe(el);

    return (): void => {
      globalThis.removeEventListener(PREVIEW_PAINTED_EVENT, onPaint);
      globalThis.clearTimeout(timer);
      io.disconnect();
    };
  }, [armed, ref]);

  return armed;
};

export { usePassiveMount, useResetPassiveGateInFirstRender };
