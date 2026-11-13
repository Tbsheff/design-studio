import { useMemo } from "react";
import type { ReactElement } from "react";

import type { BadgeRect } from "./use-tab-order.js";

import styles from "./accessibility.module.css";

interface ReaderOutlineProps {
  readonly rect: BadgeRect;
}

const ReaderOutline = ({ rect }: ReaderOutlineProps): ReactElement => {
  const place = useMemo(
    () => ({
      height: rect.height,
      left: rect.x,
      top: rect.y,
      width: rect.width,
    }),
    [rect]
  );

  return (
    <span aria-hidden="true" className={styles.readerOutline} style={place} />
  );
};

export { ReaderOutline };
