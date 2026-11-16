import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

import type { ThemeName } from "./accessibility-api.js";
import { copy } from "./copy.js";

import styles from "./accessibility.module.css";

interface ThemeChoiceProps {
  readonly disabled: boolean;
  readonly value: ThemeName;
  readonly onPick: (theme: ThemeName) => void;
}

interface ThemeOption {
  readonly label: string;
  readonly value: ThemeName;
}

const OPTIONS: readonly ThemeOption[] = [
  { label: copy.themeLight, value: "light" },
  { label: copy.themeDark, value: "dark" },
];

const toOnClass = (isOn: boolean): string => {
  if (isOn) {
    return "on";
  }

  return "";
};

const toThemeName = (value: string): ThemeName => {
  if (value === "dark") {
    return "dark";
  }

  return "light";
};

const ThemeChoice = ({
  disabled,
  value,
  onPick,
}: ThemeChoiceProps): ReactElement => {
  const handlePick = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      onPick(toThemeName(event.currentTarget.value));
    },
    [onPick]
  );

  return (
    <div className={styles.line} data-tip={copy.themeTip}>
      <span className={styles.label}>{copy.theme}</span>
      <fieldset
        aria-label={copy.theme}
        className="segmented"
        disabled={disabled}
      >
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            aria-pressed={value === option.value}
            className={toOnClass(value === option.value)}
            type="button"
            value={option.value}
            onClick={handlePick}
          >
            {option.label}
          </button>
        ))}
      </fieldset>
    </div>
  );
};

export { ThemeChoice };

export type { ThemeChoiceProps };
