import { useMemo, useState } from "react";
import type { ReactElement } from "react";

import { ReaderList } from "./reader-list.js";
import { ReaderOutline } from "./reader-outline.js";
import type { TabOrderLayerProps } from "./tab-order-layer.js";
import { useReaderLines } from "./use-reader-lines.js";
import { useReaderRects } from "./use-reader-rects.js";

import styles from "./accessibility.module.css";

const ReaderLayer = (props: TabOrderLayerProps): ReactElement => {
  const { directionId, frameId, frames, kind, projectId, round } = props;

  const ids = useMemo(
    () => ({ directionId, projectId }),
    [directionId, projectId]
  );

  const source = useMemo(
    () => ({ frameId, frames, kind }),
    [frameId, frames, kind]
  );

  const load = useReaderLines(ids, frameId, round);
  const view = useReaderRects(source, load.lines);
  const [hovered, setHovered] = useState<string | null>(null);
  let rect = null;

  if (hovered !== null) {
    rect = view.rectOf(hovered);
  }

  return (
    <div className={styles.layer}>
      {rect !== null && <ReaderOutline rect={rect} />}
      <ReaderList
        load={load}
        zoom={props.zoom}
        onHover={setHovered}
        onSelect={view.handleSelect}
      />
    </div>
  );
};

export { ReaderLayer };
