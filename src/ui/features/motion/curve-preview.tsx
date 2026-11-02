import type { ReactElement } from "react";

import { curveOf } from "./motion-model.js";

import styles from "./motion.module.css";

interface CurvePreviewProps {
  readonly easing: string;
}

const SIZE = 40;
const PAD = 4;
const SPAN = SIZE - PAD * 2;

const px = (value: number): number => PAD + value * SPAN;

const py = (value: number): number => SIZE - PAD - value * SPAN;

const CurvePreview = ({ easing }: CurvePreviewProps): ReactElement => {
  const [x1, y1, x2, y2] = curveOf(easing);
  const path = `M ${px(0)} ${py(0)} C ${px(x1)} ${py(y1)}, ${px(x2)} ${py(y2)}, ${px(1)} ${py(1)}`;

  return (
    <svg
      aria-hidden="true"
      className={styles.curve}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
    >
      <line
        className={styles.curveAxis}
        x1={px(0)}
        x2={px(1)}
        y1={py(0)}
        y2={py(1)}
      />
      <path className={styles.curveLine} d={path} />
    </svg>
  );
};

export { CurvePreview };
