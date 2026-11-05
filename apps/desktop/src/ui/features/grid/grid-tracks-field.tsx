import { Icon } from "@design-studio/ui";
import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { GridInfo } from "./deps.js";
import {
  toAddedText,
  toPxList,
  toRemovedText,
  toTrackWords,
} from "./grid-model.js";
import type { GridAxis } from "./grid-model.js";
import { GridTextField } from "./grid-text-field.js";

import styles from "./grid.module.css";

interface GridTracksFieldProps {
  readonly axis: GridAxis;
  readonly computed: string;
  readonly disabled: boolean;
  readonly info: GridInfo;
  readonly onCommit: (axis: GridAxis, text: string | null) => void;
}

const LABELS = {
  columns: {
    add: copy.addColumn,
    label: copy.columns,
    remove: copy.removeColumn,
    tip: copy.columnsTip,
  },
  rows: {
    add: copy.addRow,
    label: copy.rows,
    remove: copy.removeRow,
    tip: copy.rowsTip,
  },
} as const;

const GridTracksField = ({
  axis,
  computed,
  disabled,
  info,
  onCommit,
}: GridTracksFieldProps): ReactElement => {
  const text = info[axis].text ?? "";

  const words = useMemo(
    () => toTrackWords(info, axis, toPxList(computed)),
    [axis, computed, info]
  );

  const names = LABELS[axis];

  const handleCommit = useCallback(
    (raw: string): void => {
      if (raw === "") {
        onCommit(axis, null);

        return;
      }

      onCommit(axis, raw);
    },
    [axis, onCommit]
  );

  const handleAdd = useCallback((): void => {
    onCommit(axis, toAddedText(words));
  }, [axis, onCommit, words]);

  const handleRemove = useCallback((): void => {
    onCommit(axis, toRemovedText(words));
  }, [axis, onCommit, words]);

  return (
    <div className={styles.tracks}>
      <GridTextField
        disabled={disabled}
        id={`grid-${axis}`}
        label={names.label}
        tip={names.tip}
        value={text}
        onCommit={handleCommit}
      />
      <button
        aria-label={names.add}
        className={styles.step}
        data-tip={names.add}
        disabled={disabled}
        type="button"
        onClick={handleAdd}
      >
        <Icon name="plus" size={12} />
      </button>
      <button
        aria-label={names.remove}
        className={styles.step}
        data-tip={names.remove}
        disabled={disabled || words.length < 2}
        type="button"
        onClick={handleRemove}
      >
        <Icon name="minus" size={12} />
      </button>
    </div>
  );
};

export { GridTracksField };

export type { GridTracksFieldProps };
