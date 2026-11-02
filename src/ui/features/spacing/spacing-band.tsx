import { useCallback, useMemo } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import type { Band } from "./spacing-model.js";

import styles from "./spacing.module.css";

interface SpacingBandProps {
  readonly active: boolean;
  readonly band: Band;
  readonly label: string;
  readonly onDown: (band: Band, event: ReactPointerEvent<HTMLElement>) => void;
}

const CURSORS = {
  "column-gap": styles.ew ?? "",
  "margin-left": styles.ew ?? "",
  "margin-right": styles.ew ?? "",
  "padding-left": styles.ew ?? "",
  "padding-right": styles.ew ?? "",
} satisfies Partial<Record<Band["slot"], string>>;

const classOf = (band: Band, active: boolean): string =>
  [
    styles.band,
    styles[band.kind],
    (CURSORS as Partial<Record<Band["slot"], string>>)[band.slot] ?? styles.ns,
    active && styles.active,
  ]
    .filter(Boolean)
    .join(" ");

const SpacingBand = ({
  active,
  band,
  label,
  onDown,
}: SpacingBandProps): ReactElement => {
  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void => onDown(band, event),
    [band, onDown]
  );

  const box = useMemo(
    () => ({
      height: band.rect.height,
      left: band.rect.x,
      top: band.rect.y,
      width: band.rect.width,
    }),
    [band.rect]
  );

  return (
    <div
      className={classOf(band, active)}
      data-slot={band.slot}
      data-testid="spacing-band"
      data-tip={copy.bandLabel}
      onPointerDown={onPointerDown}
      style={box}
    >
      <span className={styles.grip} />
      <span className={styles.label} data-testid="spacing-label">
        {label}
      </span>
    </div>
  );
};

export { SpacingBand };
