import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { PointerEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { DrawSwatch } from "./draw-swatch.js";
import { DRAW_COLORS } from "./drawing-model.js";
import { MOD_LABEL } from "./mod-label-model.js";
import type { DrawTool } from "./use-draw-tool.js";

const toHintText = (count: number): string => {
  if (count === 0) {
    return "Draw on the design";
  }

  if (count === 1) {
    return "1 stroke";
  }

  return `${count} strokes`;
};

const toStrokeTip = (count: number, tip: string): string => {
  if (count === 0) {
    return copy.drawFirst;
  }

  return tip;
};

const stopPointer = (event: PointerEvent<HTMLElement>): void =>
  event.stopPropagation();

const DrawBar = ({ draw }: { draw: DrawTool }): ReactElement | null => {
  const { clear, setColor, setOn, undo } = draw;
  const finish = useCallback(() => setOn(false), [setOn]);

  if (!draw.on) {
    return null;
  }

  const count = draw.strokes.length;

  return (
    <div
      className="draw-bar"
      role="toolbar"
      aria-label={copy.drawing}
      data-testid="draw-bar"
      onPointerDown={stopPointer}
    >
      <fieldset className="draw-swatches" aria-label={copy.penColor}>
        {DRAW_COLORS.map((color) => (
          <DrawSwatch
            key={color.id}
            color={color}
            isChosen={draw.color === color.value}
            pick={setColor}
          />
        ))}
      </fieldset>
      <div className="toolbar-sep" />
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.undoStroke}
        aria-keyshortcuts="Meta+Z Control+Z"
        data-tip={toStrokeTip(count, `Undo stroke  ${MOD_LABEL}Z`)}
        disabled={count === 0}
        onClick={undo}
      >
        <Icon name="undo" />
      </button>
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.clearDrawing}
        data-tip={toStrokeTip(count, copy.clear)}
        disabled={count === 0}
        onClick={clear}
      >
        <Icon name="trash" />
      </button>
      <span className="draw-hint">{toHintText(count)}</span>
      <button
        type="button"
        className="btn small ghost"
        aria-keyshortcuts="Escape"
        onClick={finish}
      >
        {copy.done}
        <kbd>{copy.esc}</kbd>
      </button>
    </div>
  );
};

export { DrawBar };
