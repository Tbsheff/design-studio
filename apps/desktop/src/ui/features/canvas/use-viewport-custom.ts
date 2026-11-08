import { useCallback, useState } from "react";
import type { ChangeEvent } from "react";

import { uiStore } from "../../platform/storage.js";
import type { Viewport } from "../../platform/storage.js";

const MIN_SIDE = 200;

const MAX_SIDE = 4000;

interface ViewportCustom {
  readonly applyCustom: () => void;
  readonly customHeight: string;
  readonly customWidth: string;
  readonly onHeightChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onWidthChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

const toSide = (raw: string, fallback: number): number => {
  const parsed = Math.trunc(Number(raw)) || fallback;

  return Math.max(MIN_SIDE, Math.min(MAX_SIDE, parsed));
};

const useViewportCustom = (viewport: Viewport): ViewportCustom => {
  const [customWidth, setCustomWidth] = useState(String(viewport.width));
  const [customHeight, setCustomHeight] = useState(String(viewport.height));
  const [shown, setShown] = useState(`${viewport.width}x${viewport.height}`);

  if (shown !== `${viewport.width}x${viewport.height}`) {
    setShown(`${viewport.width}x${viewport.height}`);
    setCustomWidth(String(viewport.width));
    setCustomHeight(String(viewport.height));
  }

  const applyCustom = useCallback((): void => {
    const nextWidth = toSide(customWidth, viewport.width);
    const nextHeight = toSide(customHeight, viewport.height);
    setCustomWidth(String(nextWidth));
    setCustomHeight(String(nextHeight));
    uiStore.set({
      viewport: { height: nextHeight, preset: "custom", width: nextWidth },
    });
  }, [customWidth, customHeight, viewport.width, viewport.height]);

  const onWidthChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      setCustomWidth(event.target.value),
    []
  );

  const onHeightChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      setCustomHeight(event.target.value),
    []
  );

  return {
    applyCustom,
    customHeight,
    customWidth,
    onHeightChange,
    onWidthChange,
  };
};

export { useViewportCustom };

export type { ViewportCustom };
