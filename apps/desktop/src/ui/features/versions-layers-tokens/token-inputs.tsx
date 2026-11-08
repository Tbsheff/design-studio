import { useCallback, useMemo } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";

import { colorHex } from "../../../shared/token-match.js";
import { toHexColor } from "../inspector/index.js";
import { useDraftText } from "./use-draft-text.js";

interface ColorValueProps {
  readonly invalid?: boolean;
  readonly label: string;
  readonly onChange: (next: string) => void;
  readonly suffix?: string;
  readonly swatch: string;
  readonly value: string;
}

const NEUTRAL_SWATCH = "#ffffff";

const ColorValue = ({
  invalid,
  label,
  onChange,
  suffix,
  swatch,
  value,
}: ColorValueProps): ReactNode => {
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
        onKeyDown={draft.handleKeyDown}
        onFocus={draft.handleFocus}
        onBlur={draft.handleSettle}
      />
      {suffix && (
        <span className="ins-suffix tkp-suffix" aria-hidden="true">
          {suffix}
        </span>
      )}
    </div>
  );
};

export { ColorValue };
