import { useCallback } from "react";
import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";

import { parseNumber } from "./token-number.js";
import { toStepped } from "./token-stepping.js";
import { useDraftText } from "./use-draft-text.js";
import { useScrub } from "./use-scrub.js";

interface DimensionValueProps {
  readonly id: string;
  readonly invalid?: boolean;
  readonly label: string;
  readonly onChange: (next: string) => void;
  readonly short: string;
  readonly value: string;
}

const DimensionValue = ({
  id,
  invalid,
  label,
  onChange,
  short,
  value,
}: DimensionValueProps): ReactNode => {
  const draft = useDraftText(value, onChange);
  const scrub = useScrub(value, onChange);
  const { change, handleKeyDown: handleBaseKeyDown, shown } = draft;
  let staticClass = "static";

  if (parseNumber(value)) {
    staticClass = "";
  }

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
        handleBaseKeyDown(event);

        return;
      }

      let direction = -1;

      if (event.key === "ArrowUp") {
        direction = 1;
      }

      const next = toStepped(shown, direction, event.shiftKey);

      if (next) {
        event.preventDefault();
        change(next);
      }
    },
    [change, handleBaseKeyDown, shown]
  );

  const handleEdit = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      change(event.target.value);
    },
    [change]
  );

  return (
    <div className="ins-field tkp-field" data-tip={value}>
      <label
        htmlFor={id}
        className={`ins-scrub ${staticClass}`}
        onPointerCancel={scrub.handlePointerCancel}
        onPointerDown={scrub.handlePointerDown}
        onPointerMove={scrub.handlePointerMove}
        onPointerUp={scrub.handlePointerUp}
      >
        {short}
      </label>
      <input
        id={id}
        className="ins-input num"
        aria-label={label}
        aria-invalid={invalid}
        value={shown}
        spellCheck={false}
        autoComplete="off"
        onChange={handleEdit}
        onFocus={draft.handleFocus}
        onKeyDown={handleKeyDown}
        onBlur={draft.handleSettle}
      />
    </div>
  );
};

export { DimensionValue };
