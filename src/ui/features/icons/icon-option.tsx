import { useCallback } from "react";
import type { ReactElement } from "react";

import type { IconSummary } from "./deps.js";
import { IconPreview } from "./icon-preview.js";

import styles from "./icons.module.css";

interface IconOptionProps {
  readonly checked: boolean;
  readonly icon: IconSummary;
  readonly index: number;
  readonly onPick: (index: number) => void;
}

const labelOf = (icon: IconSummary): string => icon.component ?? icon.name;

const IconOption = ({
  checked,
  icon,
  index,
  onPick,
}: IconOptionProps): ReactElement => {
  const handleSelect = useCallback(() => {
    onPick(index);
  }, [index, onPick]);

  return (
    <label className={styles.cell} data-tip={labelOf(icon)}>
      <input
        checked={checked}
        className="sr-only"
        name="icon"
        type="radio"
        value={icon.name}
        onChange={handleSelect}
      />
      <IconPreview svg={icon.svg} />
      <span className="sr-only">{labelOf(icon)}</span>
    </label>
  );
};

export { IconOption };
