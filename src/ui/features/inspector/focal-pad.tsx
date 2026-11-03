import { useState, type KeyboardEvent, type PointerEvent } from "react";

import { focalOf, focalText } from "../../../shared/image.js";

const FocalPad = ({
  value,
  disabled,
  onPick,
}: {
  value: string;
  disabled: boolean;
  onPick: (focal: string) => void;
}) => {
  const [drag, setDrag] = useState<string | null>(null);
  const point = focalOf(drag ?? value);

  const at = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();

    return focalText(
      ((event.clientX - rect.left) / rect.width) * 100,
      ((event.clientY - rect.top) / rect.height) * 100
    );
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 5;

    const move = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[event.key];

    if (!move) {
      return;
    }

    event.preventDefault();
    onPick(focalText(point.x + (move[0] ?? 0), point.y + (move[1] ?? 0)));
  };

  return (
    <div
      className={`img-focal${disabled ? " off" : ""}`}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label="Focal point"
      aria-valuetext={focalText(point.x, point.y)}
      data-tip="Click or drag to set the part of the image that stays in view"
      onPointerDown={(event) => {
        if (disabled) {
          return;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag(at(event));
      }}
      onPointerMove={(event) => drag !== null && setDrag(at(event))}
      onPointerUp={(event) => {
        if (drag === null) {
          return;
        }

        const next = at(event);
        setDrag(null);
        onPick(next);
      }}
      onKeyDown={onKey}
    >
      <span
        className="img-focal-dot"
        style={{ left: `${point.x}%`, top: `${point.y}%` }}
      />
    </div>
  );
};

export { FocalPad };
