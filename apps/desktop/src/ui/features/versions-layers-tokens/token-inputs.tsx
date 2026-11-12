import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useCallback, useMemo } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";

import { colorHex } from "../../../shared/token-match.js";
import { toHexColor } from "../inspector/index.js";
import { toShortValue } from "./token-value-model.js";
import { useDraftText } from "./use-draft-text.js";

interface ColorValueProps {
  readonly invalid?: boolean;
  readonly label: string;
  readonly trail?: IconName;
  readonly onChange: (next: string) => void;
  readonly swatch: string;
  readonly value: string;
}

const NEUTRAL_SWATCH = "#ffffff";
const TRAIL_ICON_SIZE = 12;

const ColorValue = ({
  invalid,
  label,
  onChange,
  swatch,
  trail,
  value,
}: ColorValueProps): ReactNode => {
  const draft = useDraftText(value, onChange);
  const { change } = draft;
  const hex = toHexColor(swatch) ?? colorHex(swatch);
  let emptyClass = "empty";
  let text = toShortValue(value);

  if (draft.isFocused) {
    text = draft.shown;
  }

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
        value={text}
        spellCheck={false}
        autoComplete="off"
        onChange={handleEdit}
        onKeyDown={draft.handleKeyDown}
        onFocus={draft.handleFocus}
        onBlur={draft.handleSettle}
      />
      {trail && (
        <span className="tkp-trail" aria-hidden="true">
          <Icon name={trail} size={TRAIL_ICON_SIZE} />
        </span>
      )}
    </div>
  );
};

export { ColorValue };
