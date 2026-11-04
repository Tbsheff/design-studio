import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import type { TextStyle } from "./deps.js";
import { metaOf, previewLook } from "./style-match.js";

import styles from "./text-styles.module.css";

interface StyleRowProps {
  readonly active: boolean;
  readonly disabled: boolean;
  readonly item: TextStyle;
  readonly onPick: (name: string) => void;
}

const StyleRow = ({
  active,
  disabled,
  item,
  onPick,
}: StyleRowProps): ReactElement => {
  const look = useMemo(() => previewLook(item), [item]);

  const pickStyle = useCallback((): void => {
    onPick(item.name);
  }, [item.name, onPick]);

  return (
    <button
      aria-checked={active}
      className={styles.row}
      disabled={disabled}
      role="menuitemradio"
      type="button"
      onClick={pickStyle}
    >
      <span className={styles.preview} style={look}>
        {item.name}
      </span>
      <span className={styles.meta}>{metaOf(item)}</span>
    </button>
  );
};

export { StyleRow };
