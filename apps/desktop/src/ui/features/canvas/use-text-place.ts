import { startTransition, useCallback, useMemo, useRef } from "react";
import type { CSSProperties, PointerEvent, RefObject } from "react";

import { errorText } from "../../api.js";
import { heldTool } from "../../platform/canvas-tool.js";
import { startPlacedTextEdit, toTextRequest } from "./text-place-model.js";
import { useDropAt } from "./use-drop-at.js";
import type { Drop, Point, VectorLayerProps } from "./vector-layer-types.js";
import { placeOf } from "./vector-place-model.js";
import { runVector } from "./vector-tool-model.js";

interface TextPlace {
  readonly onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  readonly root: RefObject<HTMLDivElement | null>;
  readonly style: CSSProperties;
}

const placeTextAt = async (
  props: VectorLayerProps,
  dropAt: (point: Point) => Promise<Drop>,
  at: Point
): Promise<void> => {
  const { message, place } = placeOf(await dropAt(at));

  if (place === null) {
    props.notify(message);

    return;
  }

  heldTool.set(null);
  const request = toTextRequest(at, place, props.page ?? null);
  const result = await runVector(props.projectId, props.directionId, request);
  const [first] = result.select;

  if (first) {
    startPlacedTextEdit(props, first);
  }
};

const useTextPlace = (props: VectorLayerProps): TextPlace => {
  const root = useRef<HTMLDivElement | null>(null);
  const dropAt = useDropAt(props.post, props.listen, true);
  const { frame, notify, zoom } = props;

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      const rect = root.current?.getBoundingClientRect();

      if (event.button !== 0 || !rect || rect.width === 0) {
        return;
      }

      event.preventDefault();
      root.current?.focus({ preventScroll: true });

      const at = {
        x: ((event.clientX - rect.left) * frame.width) / rect.width,
        y: ((event.clientY - rect.top) * frame.height) / rect.height,
      };

      startTransition(async () => {
        try {
          await placeTextAt(props, dropAt, at);
        } catch (error) {
          notify(errorText(error));
        }
      });
    },
    [dropAt, frame.height, frame.width, notify, props]
  );

  const style = useMemo(
    () =>
      ({
        ["--inv-zoom" as string]: 1 / zoom,
        height: frame.height,
        width: frame.width,
      }) as CSSProperties,
    [zoom, frame.width, frame.height]
  );

  return { onPointerDown, root, style };
};

export { useTextPlace };
