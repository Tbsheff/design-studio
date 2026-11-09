import { useCallback } from "react";
import type { ReactElement } from "react";

import { toRegistryName } from "./block-model.js";
import { copy } from "./copy.js";

import styles from "./block.module.css";

interface BlockMissingRowProps {
  readonly isBusy: boolean;
  readonly name: string;
  readonly onAdd: (name: string) => void;
}

const BlockMissingRow = ({
  isBusy,
  name,
  onAdd,
}: BlockMissingRowProps): ReactElement => {
  const handleAdd = useCallback((): void => onAdd(name), [name, onAdd]);

  return (
    <li className={styles.missingRow} data-missing={toRegistryName(name)}>
      <span className={styles.missingName}>{name}</span>
      <button
        className={styles.link}
        data-tip={copy.addTip}
        disabled={isBusy}
        onClick={handleAdd}
        type="button"
      >
        {copy.addFromShadcn}
      </button>
    </li>
  );
};

export { BlockMissingRow };
