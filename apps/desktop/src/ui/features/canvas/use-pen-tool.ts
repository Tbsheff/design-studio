import { useState } from "react";
import type { PointerEvent } from "react";

import type { PenAnchor } from "./drawing-model.js";
import { useLatestGetter } from "./use-latest-getter.js";
import { usePenKeys } from "./use-pen-keys.js";
import type {
  Commit,
  PointOf,
  VectorLayerProps,
} from "./vector-layer-types.js";
import {
  MIN_PEN_POINTS,
  isNearFirst,
  toBentAnchors,
  toPathRequest,
} from "./vector-pen-model.js";
import { vectorTool } from "./vector-tool-model.js";

interface PenTool {
  anchors: PenAnchor[];
  isClosing: boolean;
  isDragging: boolean;
  hover: { x: number; y: number } | null;
  onDown: (event: PointerEvent<HTMLDivElement>) => void;
  onKey: (key: string) => boolean;
  onMove: (event: PointerEvent<HTMLDivElement>) => void;
  onUp: () => void;
}

const usePenTool = (
  props: VectorLayerProps,
  commit: Commit,
  pointOf: PointOf
): PenTool => {
  const [anchors, setAnchors] = useState<PenAnchor[]>([]);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const getAnchors = useLatestGetter(anchors);

  const finish = (isClosed: boolean): void => {
    const list = getAnchors();
    const [first] = list;
    setAnchors([]);
    setHover(null);

    if (!first || list.length < MIN_PEN_POINTS) {
      vectorTool.set(null);

      return;
    }

    void commit(first, (origin) => toPathRequest(list, isClosed, origin));
  };

  const onDown = (event: PointerEvent<HTMLDivElement>): void => {
    const point = pointOf(event);

    if (event.button !== 0 || !point) {
      return;
    }

    event.preventDefault();

    if (isNearFirst(getAnchors(), point, props.zoom)) {
      finish(true);

      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    setAnchors((prev) => [...prev, { x: point.x, y: point.y }]);
  };

  const onMove = (event: PointerEvent<HTMLDivElement>): void => {
    const point = pointOf(event);

    if (!point) {
      return;
    }

    setHover(point);

    if (isDragging) {
      setAnchors((prev) => toBentAnchors(prev, point, props.zoom));
    }
  };

  const onUp = (): void => setIsDragging(false);

  const onKey = usePenKeys(getAnchors, finish, setAnchors);

  const isClosing = isNearFirst(anchors, hover, props.zoom);

  return { anchors, hover, isClosing, isDragging, onDown, onKey, onMove, onUp };
};

export { usePenTool };

export type { PenTool };
