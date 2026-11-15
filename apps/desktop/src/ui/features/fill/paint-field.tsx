import { useCallback } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { ColorField } from "./deps.js";
import type { DirectEdit } from "./deps.js";
import { PAINT_PROP, usePaintEdit } from "./use-paint-edit.js";
import type { PaintLive } from "./use-paint-edit.js";

import styles from "./fill.module.css";

interface PaintFieldProps {
  readonly color: string;
  readonly edit: DirectEdit;
  readonly label: string;
  readonly live: PaintLive | null;
  readonly short: string;
  readonly onColor: (color: string) => void;
  readonly onEnter: () => void;
}

const PaintField = ({
  color,
  edit,
  label,
  live,
  short,
  onColor,
  onEnter,
}: PaintFieldProps): ReactElement => {
  const paint = usePaintEdit(edit, color, onColor, live);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>): void => {
      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        onEnter();
      }
    },
    [onEnter]
  );

  return (
    <div className={styles.paint} role="presentation" onKeyDown={handleKeyDown}>
      <ColorField edit={paint} label={label} prop={PAINT_PROP} short={short} />
    </div>
  );
};

export { PaintField };
