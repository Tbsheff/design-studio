import { useCallback } from "react";
import type { ReactElement } from "react";

import type { OptionName } from "./text-search-model.js";

import styles from "./text-search.module.css";

interface OptionToggleProps {
  readonly glyph: string;
  readonly isOn: boolean;
  readonly label: string;
  readonly name: OptionName;
  readonly onToggle: (name: OptionName) => void;
}

const OptionToggle = ({
  glyph,
  isOn,
  label,
  name,
  onToggle,
}: OptionToggleProps): ReactElement => {
  const handleToggle = useCallback((): void => {
    onToggle(name);
  }, [name, onToggle]);

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label={label}
      aria-pressed={isOn}
      data-tip={label}
      onClick={handleToggle}
    >
      {glyph}
    </button>
  );
};

export { OptionToggle };
