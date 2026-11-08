import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ScreenGroupChip } from "./screen-group-chip.js";
import { ScreenGroupDetail } from "./screen-group-detail.js";
import type { PlanGroup } from "./screen-model.js";

import styles from "./screen.module.css";

interface ScreenGroupChipsProps {
  readonly groups: readonly PlanGroup[];
  readonly onPick: (name: string) => void;
  readonly picked: PlanGroup | null;
}

const ScreenGroupChips = ({
  groups,
  onPick,
  picked,
}: ScreenGroupChipsProps): ReactElement => (
  <fieldset className={styles.group}>
    <legend className={styles.fieldLabel}>{copy.groupLabel}</legend>
    <div className={styles.chips}>
      {groups.map((group) => (
        <ScreenGroupChip
          isPicked={picked?.name === group.name}
          key={group.name}
          name={group.name}
          onPick={onPick}
        />
      ))}
    </div>
    {picked && <ScreenGroupDetail group={picked} />}
  </fieldset>
);

export { ScreenGroupChips };
