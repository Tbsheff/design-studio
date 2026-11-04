import { useCallback, useMemo } from "react";
import type { KeyboardEvent, PointerEvent, ReactElement } from "react";

import { stopText } from "./copy.js";
import { moveStop, positionAt, removeStop } from "./fill-model.js";
import type { FillDraft, StopDraft } from "./fill-model.js";

import styles from "./fill.module.css";

interface StopHandleProps {
  readonly disabled: boolean;
  readonly draft: FillDraft;
  readonly index: number;
  readonly stop: StopDraft;
  readonly onDraft: (next: FillDraft) => void;
}

type Pointer = PointerEvent<HTMLButtonElement>;

const SMALL_STEP = 1;
const LARGE_STEP = 10;

const STEPS = new Map<string, number>([
  ["ArrowLeft", -1],
  ["ArrowDown", -1],
  ["ArrowRight", 1],
  ["ArrowUp", 1],
]);

const REMOVE_KEYS = new Set(["Backspace", "Delete"]);

const stepSize = (shift: boolean): number => {
  if (shift) {
    return LARGE_STEP;
  }

  return SMALL_STEP;
};

const keyDraft = (
  draft: FillDraft,
  stop: StopDraft,
  event: KeyboardEvent<HTMLButtonElement>
): FillDraft | null => {
  if (REMOVE_KEYS.has(event.key)) {
    return removeStop(draft, stop.id);
  }

  const step = STEPS.get(event.key);

  if (!step) {
    return null;
  }

  return moveStop(
    draft,
    stop.id,
    stop.position + step * stepSize(event.shiftKey)
  );
};

const dragPosition = (event: Pointer): number | null => {
  const button = event.currentTarget;
  const rect = button.parentElement?.getBoundingClientRect();

  if (!rect || !button.hasPointerCapture(event.pointerId)) {
    return null;
  }

  return positionAt(event.clientX, rect);
};

const releasePointer = (event: Pointer): void => {
  event.currentTarget.releasePointerCapture(event.pointerId);
};

const StopHandle = ({
  disabled,
  draft,
  index,
  stop,
  onDraft,
}: StopHandleProps): ReactElement => {
  const handleSelect = useCallback((): void => {
    if (draft.selected !== stop.id) {
      onDraft({ ...draft, selected: stop.id });
    }
  }, [draft, onDraft, stop.id]);

  const handleDown = useCallback(
    (event: Pointer): void => {
      event.currentTarget.setPointerCapture(event.pointerId);
      handleSelect();
    },
    [handleSelect]
  );

  const handleMove = useCallback(
    (event: Pointer): void => {
      const position = dragPosition(event);

      if (position !== null && position !== stop.position) {
        onDraft(moveStop(draft, stop.id, position));
      }
    },
    [draft, onDraft, stop.id, stop.position]
  );

  const handleKey = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>): void => {
      const next = keyDraft(draft, stop, event);

      if (next) {
        event.preventDefault();
        onDraft(next);
      }
    },
    [draft, onDraft, stop]
  );

  const place = useMemo(
    () => ({
      ["--stop-color" as string]: stop.color,
      left: `${stop.position}%`,
    }),
    [stop.color, stop.position]
  );

  return (
    <button
      aria-label={stopText(index, stop.position, stop.color)}
      aria-pressed={draft.selected === stop.id}
      className={styles.stop}
      disabled={disabled}
      style={place}
      type="button"
      onFocus={handleSelect}
      onKeyDown={handleKey}
      onPointerCancel={releasePointer}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={releasePointer}
    />
  );
};

export { StopHandle };
