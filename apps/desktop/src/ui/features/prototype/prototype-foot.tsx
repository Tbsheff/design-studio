import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toCreateLabel } from "./prototype-model.js";

import styles from "./prototype.module.css";

interface PrototypeFootProps {
  readonly failure: string | null;
  readonly isEmpty: boolean;
  readonly isPending: boolean;
  readonly onCancel: () => void;
}

const PrototypeFoot = ({
  failure,
  isEmpty,
  isPending,
  onCancel,
}: PrototypeFootProps): ReactElement => (
  <footer className={styles.foot}>
    {failure !== null && (
      <p className={styles.failure} role="alert">
        {failure}
      </p>
    )}
    <button type="button" className="btn small" onClick={onCancel}>
      {copy.cancel}
    </button>
    <button
      type="submit"
      className="btn small primary"
      disabled={isEmpty || isPending}
      data-testid="prototype-create"
    >
      {toCreateLabel(isPending)}
    </button>
  </footer>
);

export { PrototypeFoot };

export type { PrototypeFootProps };
