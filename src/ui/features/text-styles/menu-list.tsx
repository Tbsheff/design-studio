import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ListBody } from "./list-body.js";
import type { TextStylesState } from "./use-text-styles.js";

import styles from "./text-styles.module.css";

interface MenuListProps {
  readonly canCreate: boolean;
  readonly current: string | null;
  readonly detachable: boolean;
  readonly onCreate: () => void;
  readonly onDetach: () => void;
  readonly onPick: (name: string) => void;
  readonly state: TextStylesState;
}

const MenuList = ({
  canCreate,
  current,
  detachable,
  onCreate,
  onDetach,
  onPick,
  state,
}: MenuListProps): ReactElement => (
  <div aria-label={copy.menu} className={styles.menu} role="menu">
    <ListBody current={current} state={state} onPick={onPick} />
    <hr className={styles.divider} />
    <button
      className={styles.action}
      disabled={!canCreate || state.busy}
      role="menuitem"
      type="button"
      onClick={onCreate}
    >
      {copy.create}
    </button>
    <button
      className={styles.action}
      disabled={!detachable || state.busy}
      role="menuitem"
      type="button"
      onClick={onDetach}
    >
      {copy.detach}
    </button>
  </div>
);

export { MenuList };
