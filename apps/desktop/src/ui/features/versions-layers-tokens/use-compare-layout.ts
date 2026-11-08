import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { toLayout } from "./compare-mode-model.js";
import type { Mode } from "./compare-mode-model.js";

const INITIAL_SCALE = 0.5;

interface CompareLayout {
  readonly isStacked: boolean;
  readonly ref: RefObject<HTMLDivElement | null>;
  readonly scale: number;
}

const useCompareLayout = (
  mode: Mode,
  viewport: { readonly height: number; readonly width: number }
): CompareLayout => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(INITIAL_SCALE);
  const [isStacked, setIsStacked] = useState(false);
  const { height, width } = viewport;

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const measure = (): void => {
      const layout = toLayout(
        mode,
        { height: element.clientHeight, width: element.clientWidth },
        { height, width }
      );

      setIsStacked(layout.isStacked);
      setScale(layout.scale);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();

    return (): void => {
      observer.disconnect();
    };
  }, [height, width, mode]);

  return { isStacked, ref, scale };
};

export { useCompareLayout };
