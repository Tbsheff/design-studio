import { useMemo } from "react";
import type { ReactElement } from "react";

import styles from "./token-sweep.module.css";

interface SwatchProps {
  readonly color: string | null;
}

const Swatch = ({ color }: SwatchProps): ReactElement | null => {
  const look = useMemo(() => ({ background: color ?? "transparent" }), [color]);

  if (color === null) {
    return null;
  }

  return <span aria-hidden="true" className={styles.swatch} style={look} />;
};

export { Swatch };
