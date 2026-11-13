import { useMemo } from "react";
import type { PointerEvent, ReactElement, ReactNode, WheelEvent } from "react";

import { copy } from "./copy.js";
import { toReaderRows } from "./reader-model.js";
import type { ReaderRowView } from "./reader-model.js";
import { ReaderRow } from "./reader-row.js";
import type { ReaderLoad } from "./use-reader-lines.js";

import styles from "./accessibility.module.css";

interface ReaderListProps {
  readonly load: ReaderLoad;
  readonly onHover: (selector: string | null) => void;
  readonly onSelect: (selector: string) => void;
  readonly zoom: number;
}

const MIN_ZOOM = 0.1;

const stopWheel = (event: WheelEvent<HTMLElement>): void => {
  event.stopPropagation();
};

const stopPointer = (event: PointerEvent<HTMLElement>): void => {
  event.stopPropagation();
};

const toBody = (
  rows: readonly ReaderRowView[],
  load: ReaderLoad,
  row: (item: ReaderRowView) => ReactNode
): ReactNode => {
  if (load.error !== null) {
    return <p className={styles.error}>{load.error}</p>;
  }

  if (rows.length > 0) {
    return (
      <ol className={styles.readerLines}>{rows.map((item) => row(item))}</ol>
    );
  }

  if (load.isLoaded) {
    return <p className={styles.note}>{copy.readerEmpty}</p>;
  }

  return <p className={styles.note}>{copy.readerLoading}</p>;
};

const ReaderList = ({
  load,
  onHover,
  onSelect,
  zoom,
}: ReaderListProps): ReactElement => {
  const rows = useMemo(() => toReaderRows(load.lines), [load.lines]);

  const place = useMemo(
    () => ({ transform: `scale(${1 / Math.max(zoom, MIN_ZOOM)})` }),
    [zoom]
  );

  const body = toBody(rows, load, (row) => (
    <ReaderRow key={row.key} row={row} onHover={onHover} onSelect={onSelect} />
  ));

  return (
    <div
      className={styles.reader}
      role="presentation"
      style={place}
      onPointerDown={stopPointer}
      onWheel={stopWheel}
    >
      <header aria-label={copy.readerList} className={styles.readerHead}>
        <span>{copy.readerTitle}</span>
        <span className={styles.readerCount}>
          {copy.readerCount(rows.length)}
        </span>
      </header>
      {body}
      <p className={styles.readerNote}>{copy.readerNote}</p>
    </div>
  );
};

export { ReaderList };
