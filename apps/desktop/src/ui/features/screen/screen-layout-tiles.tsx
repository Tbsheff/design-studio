import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ScreenLayoutTile } from "./screen-layout-tile.js";
import { LAYOUT_OPTIONS } from "./screen-model.js";
import type { ScreenLayoutId } from "./screen-model.js";

import styles from "./screen.module.css";

interface ScreenLayoutTilesProps {
  readonly onPick: (layout: ScreenLayoutId) => void;
  readonly picked: ScreenLayoutId;
}

const ScreenLayoutTiles = ({
  onPick,
  picked,
}: ScreenLayoutTilesProps): ReactElement => (
  <fieldset className={styles.group}>
    <legend className={styles.fieldLabel}>{copy.layoutLabel}</legend>
    <div className={styles.tiles}>
      {LAYOUT_OPTIONS.map((option) => (
        <ScreenLayoutTile
          isPicked={picked === option.id}
          key={option.id}
          onPick={onPick}
          option={option}
        />
      ))}
    </div>
  </fieldset>
);

export { ScreenLayoutTiles };
