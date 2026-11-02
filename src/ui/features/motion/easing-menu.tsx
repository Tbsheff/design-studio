import { useId } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { CurvePreview } from "./curve-preview.js";
import { EasingSelect } from "./easing-select.js";

import styles from "./motion.module.css";

interface EasingMenuProps {
  readonly disabled: boolean;
  readonly value: string;
  readonly onValue: (easing: string) => void;
}

const EasingMenu = ({
  disabled,
  value,
  onValue,
}: EasingMenuProps): ReactElement => {
  const id = useId();

  return (
    <div className={styles.field}>
      <label className="ins-scrub static" htmlFor={id}>
        {copy.easing}
      </label>
      <span className={styles.easing}>
        <EasingSelect
          disabled={disabled}
          id={id}
          value={value}
          onValue={onValue}
        />
        <CurvePreview easing={value} />
      </span>
    </div>
  );
};

export { EasingMenu };
