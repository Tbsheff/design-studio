import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { EffectStyle } from "./effect-types.js";

import styles from "./effect.module.css";

interface EffectStylePickerProps {
  readonly disabled: boolean;
  readonly styleName: string | null;
  readonly styles: readonly EffectStyle[];
  readonly onPick: (name: string | null) => void;
}

const STYLE_ID = "effect-style";

const toStyleOptions = (
  saved: readonly EffectStyle[]
): readonly UiSelectOption[] => [
  { label: copy.styleNone, value: "" },
  ...saved.map((entry) => ({ label: entry.name, value: entry.name })),
];

const EffectStylePicker = ({
  disabled,
  styleName,
  styles: saved,
  onPick,
}: EffectStylePickerProps): ReactElement => {
  const options = useMemo(() => toStyleOptions(saved), [saved]);

  const pickStyle = useCallback(
    (next: string): void => {
      onPick(next || null);
    },
    [onPick]
  );

  return (
    <div className="ins-field select">
      <label className={styles.label} htmlFor={STYLE_ID}>
        {copy.style}
      </label>
      <UiSelect
        aria-label={copy.style}
        disabled={disabled}
        id={STYLE_ID}
        options={options}
        tip={copy.styleTip}
        value={styleName ?? ""}
        onChange={pickStyle}
      />
    </div>
  );
};

export { EffectStylePicker };

export type { EffectStylePickerProps };
