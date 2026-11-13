import { useCallback, useMemo, useRef } from "react";
import type { CSSProperties, PointerEvent, ReactElement } from "react";

import { useBoxTool } from "./use-box-tool.js";
import type { BoxTool } from "./use-box-tool.js";
import { useDropAt } from "./use-drop-at.js";
import { usePenTool } from "./use-pen-tool.js";
import type { PenTool } from "./use-pen-tool.js";
import { useVectorCommit } from "./use-vector-commit.js";
import { useVectorLayerKeys } from "./use-vector-layer-keys.js";
import type { PointOf, VectorLayerProps } from "./vector-layer-types.js";
import { VectorPreview } from "./vector-preview.js";
import { useVectorTool } from "./vector-tool-model.js";
import type { VectorToolId } from "./vector-tool-model.js";

const HINTS: Record<VectorToolId, string> = {
  ellipse: "Drag to draw an ellipse. Shift keeps it round. Esc stops.",
  pen: "Click to add points, drag to curve. Click the first point or press Enter to close, Esc to end.",
  rect: "Drag to draw a rectangle. Shift keeps it square. Esc stops.",
};

const LABELS: Record<VectorToolId, string> = {
  ellipse: "Ellipse tool",
  pen: "Pen tool",
  rect: "Rectangle tool",
};

const toHandlers = (
  tool: VectorToolId | null,
  pen: PenTool,
  box: BoxTool
): PenTool | BoxTool => {
  if (tool === "pen") {
    return pen;
  }

  return box;
};

const VectorLayer = (props: VectorLayerProps): ReactElement | null => {
  const { tool } = useVectorTool();
  const root = useRef<HTMLDivElement>(null);
  const dropAt = useDropAt(props.post, props.listen, false);
  const commit = useVectorCommit(props, dropAt);
  const { frame, zoom } = props;

  const pointOf = useCallback<PointOf>(
    (event) => {
      const rect = root.current?.getBoundingClientRect();

      if (!rect || rect.width === 0) {
        return null;
      }

      return {
        x: ((event.clientX - rect.left) * frame.width) / rect.width,
        y: ((event.clientY - rect.top) * frame.height) / rect.height,
      };
    },
    [frame.width, frame.height]
  );

  const box = useBoxTool(props, tool ?? "rect", commit, pointOf);
  const pen = usePenTool(props, commit, pointOf);
  useVectorLayerKeys(tool, pen.onKey);

  const style = useMemo(
    () =>
      ({
        ["--inv-zoom" as string]: 1 / zoom,
        height: frame.height,
        width: frame.width,
      }) as CSSProperties,
    [zoom, frame.width, frame.height]
  );

  const handlers = toHandlers(tool, pen, box);
  const { onDown, onMove, onUp } = handlers;

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>): void => {
      root.current?.focus({ preventScroll: true });
      onDown(event);
    },
    [onDown]
  );

  if (!tool) {
    return null;
  }

  return (
    <div
      ref={root}
      className={`vector-layer ${tool}`}
      data-testid="vector-layer"
      role="application"
      aria-label={LABELS[tool]}
      style={style}
      tabIndex={-1}
      onPointerDown={onPointerDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <VectorPreview box={box} pen={pen} tool={tool} zoom={zoom} />
      <output className="vector-hint">{HINTS[tool]}</output>
    </div>
  );
};

export { VectorLayer };
