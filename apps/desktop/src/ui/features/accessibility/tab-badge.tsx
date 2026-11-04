import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { PlacedBadge } from "./use-tab-order.js";

import styles from "./accessibility.module.css";

interface TabBadgeProps {
  readonly badge: PlacedBadge;
  readonly zoom: number;
}

const MIN_ZOOM = 0.1;

const TabBadge = ({ badge, zoom }: TabBadgeProps): ReactElement => {
  const { rect } = badge;

  const outline = useMemo(
    () => ({
      height: rect.height,
      left: rect.x,
      top: rect.y,
      width: rect.width,
    }),
    [rect]
  );

  const place = useMemo(
    () => ({
      left: rect.x,
      top: rect.y,
      transform: `translate(-30%, -30%) scale(${1 / Math.max(zoom, MIN_ZOOM)})`,
    }),
    [rect, zoom]
  );

  let label = copy.tabStop(badge.order, badge.name);
  let className = styles.stop;

  if (badge.isUnnamed) {
    label = copy.tabStopUnnamed(badge.order);
    className = `${styles.stop} ${styles.unnamed}`;
  }

  return (
    <>
      {badge.isUnnamed && (
        <span aria-hidden="true" className={styles.outline} style={outline} />
      )}
      <figure
        aria-label={label}
        className={className}
        data-tip={label}
        style={place}
      >
        {badge.order}
        {badge.isUnnamed && copy.unnamedMark}
      </figure>
    </>
  );
};

export { TabBadge };

export type { TabBadgeProps };
