import { useCallback, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
} from "react";

import { colorHex } from "../../../shared/token-match.js";
import {
  toHexColor,
  toNumberText,
  toParsedNumber,
} from "../inspector/index.js";

interface ValueProps {
  readonly invalid?: boolean;
  readonly label: string;
  readonly onChange: (next: string) => void;
  readonly value: string;
}

interface DraftText {
  readonly change: (next: string) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly settle: () => void;
  readonly shown: string;
}

interface ScrubStart {
  readonly value: string;
  readonly startX: number;
}

interface ScrubHandlers {
  readonly onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerUp: (event: PointerEvent<HTMLElement>) => void;
}

const SCRUB_PX_PER_STEP = 2;
const NEUTRAL_SWATCH = "#ffffff";
const REM_STEP = 0.0625;
const UNIT_STEP = 1;
const SHIFT_FACTOR = 10;

const useDraftText = (
  value: string,
  onChange: (next: string) => void
): DraftText => {
  const [text, setText] = useState<string | null>(null);

  const change = useCallback(
    (next: string): void => {
      setText(next);

      if (next.trim() !== "") {
        onChange(next.trim());
      }
    },
    [onChange]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.currentTarget.blur();
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setText(null);
        event.currentTarget.blur();
      }
    },
    []
  );

  const settle = useCallback((): void => {
    setText(null);
  }, []);

  return { change, onKeyDown, settle, shown: text ?? value };
};

const toStep = (unit: string, isShift: boolean): number => {
  let base = UNIT_STEP;

  if (unit === "rem" || unit === "em") {
    base = REM_STEP;
  }

  if (isShift) {
    return base * SHIFT_FACTOR;
  }

  return base;
};

const toStepped = (
  value: string,
  steps: number,
  isShift: boolean
): string | null => {
  const parsed = toParsedNumber(value);

  if (!parsed) {
    return null;
  }

  return toNumberText(
    parsed.value + steps * toStep(parsed.unit, isShift),
    parsed.unit
  );
};

const useScrub = (
  value: string,
  onChange: (next: string) => void
): ScrubHandlers => {
  const start = useRef<ScrubStart | null>(null);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>): void => {
      if (event.button !== 0 || !toParsedNumber(value)) {
        return;
      }

      event.preventDefault();
      start.current = { startX: event.clientX, value };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [value]
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>): void => {
      const origin = start.current;

      if (!origin) {
        return;
      }

      const next = toStepped(
        origin.value,
        Math.round((event.clientX - origin.startX) / SCRUB_PX_PER_STEP),
        event.shiftKey
      );

      if (next) {
        onChange(next);
      }
    },
    [onChange]
  );

  const onPointerUp = useCallback((event: PointerEvent<HTMLElement>): void => {
    start.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return {
    onPointerCancel: onPointerUp,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
};

const TextValue = ({
  invalid,
  label,
  mono,
  onChange,
  value,
}: ValueProps & { readonly mono?: boolean }): ReactNode => {
  const draft = useDraftText(value, onChange);
  const { change } = draft;
  let monoClass = "";

  if (mono) {
    monoClass = "mono";
  }

  const handleEdit = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      change(event.target.value);
    },
    [change]
  );

  return (
    <div className={`ins-field tkp-field ${monoClass}`} data-tip={value}>
      <input
        className="ins-input tkp-text"
        aria-label={label}
        aria-invalid={invalid}
        value={draft.shown}
        spellCheck={false}
        autoComplete="off"
        onChange={handleEdit}
        onKeyDown={draft.onKeyDown}
        onBlur={draft.settle}
      />
    </div>
  );
};

const ColorValue = ({
  invalid,
  label,
  onChange,
  suffix,
  swatch,
  value,
}: ValueProps & {
  readonly suffix?: string;
  readonly swatch: string;
}): ReactNode => {
  const draft = useDraftText(value, onChange);
  const { change } = draft;
  const hex = toHexColor(swatch) ?? colorHex(swatch);
  let emptyClass = "empty";

  if (hex) {
    emptyClass = "";
  }

  const swatchStyle = useMemo(
    () => ({ ["--swatch" as string]: swatch || "transparent" }),
    [swatch]
  );

  const handleColorInput = useCallback(
    (event: FormEvent<HTMLInputElement>): void => {
      onChange(event.currentTarget.value);
    },
    [onChange]
  );

  const handlePick = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange(event.currentTarget.value);
    },
    [onChange]
  );

  const handleEdit = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      change(event.target.value);
    },
    [change]
  );

  return (
    <div className="ins-field color tkp-field" data-tip={value}>
      <span className={`ins-swatch ${emptyClass}`} style={swatchStyle}>
        <input
          type="color"
          aria-label={`${label} picker`}
          value={hex ?? NEUTRAL_SWATCH}
          onInput={handleColorInput}
          onChange={handlePick}
        />
      </span>
      <input
        className="ins-input"
        aria-label={label}
        aria-invalid={invalid}
        value={draft.shown}
        spellCheck={false}
        autoComplete="off"
        onChange={handleEdit}
        onKeyDown={draft.onKeyDown}
        onBlur={draft.settle}
      />
      {suffix && (
        <span className="ins-suffix tkp-suffix" aria-hidden="true">
          {suffix}
        </span>
      )}
    </div>
  );
};

const DimensionValue = ({
  id,
  invalid,
  label,
  onChange,
  short,
  value,
}: ValueProps & {
  readonly id: string;
  readonly short: string;
}): ReactNode => {
  const draft = useDraftText(value, onChange);
  const scrub = useScrub(value, onChange);
  const { change, shown } = draft;
  const { onKeyDown } = draft;
  let staticClass = "static";

  if (toParsedNumber(value)) {
    staticClass = "";
  }

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
        onKeyDown(event);

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
    [change, onKeyDown, shown]
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
        onPointerCancel={scrub.onPointerCancel}
        onPointerDown={scrub.onPointerDown}
        onPointerMove={scrub.onPointerMove}
        onPointerUp={scrub.onPointerUp}
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
        onKeyDown={handleKeyDown}
        onBlur={draft.settle}
      />
    </div>
  );
};

export { TextValue, ColorValue, DimensionValue };
