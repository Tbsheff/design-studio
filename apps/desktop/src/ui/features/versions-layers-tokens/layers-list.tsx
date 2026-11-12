import type {
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  Ref,
  UIEvent,
} from "react";

import { COPY } from "./copy.js";
import { toActiveDescendant, toListClass } from "./layer-row-model.js";
import { LayersListBody } from "./layers-list-body.js";
import type { LayerTree } from "./layers-tree.js";

interface LayersListProps {
  readonly children: ReactNode;
  readonly isBusy: boolean;
  readonly isDragging: boolean;
  readonly isEmpty: boolean;
  readonly isSearching: boolean;
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  readonly onPointerCancel: () => void;
  readonly onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onPointerUp: () => void;
  readonly onScroll: (event: UIEvent<HTMLDivElement>) => void;
  readonly ref: Ref<HTMLDivElement>;
  readonly rowCount: number;
  readonly selectedIndex: number;
  readonly selectedNode: number | null;
  readonly tree: LayerTree | null;
}

const LayersList = (props: LayersListProps): ReactNode => {
  const { ref, tree } = props;

  return (
    <div
      ref={ref}
      className={toListClass(props.isDragging)}
      role="tree"
      aria-label={COPY.labelLayers}
      tabIndex={0}
      aria-activedescendant={toActiveDescendant(
        props.selectedIndex,
        props.selectedNode
      )}
      aria-busy={props.isBusy}
      onKeyDown={props.onKeyDown}
      onPointerMove={props.onPointerMove}
      onPointerUp={props.onPointerUp}
      onPointerCancel={props.onPointerCancel}
      onScroll={props.onScroll}
    >
      <LayersListBody
        isEmpty={props.isEmpty}
        isSearching={props.isSearching}
        rowCount={props.rowCount}
        tree={tree}
      >
        {props.children}
      </LayersListBody>
      {tree?.truncated && !props.isSearching && (
        <div className="layers-note">
          {`${COPY.layersShowingPrefix}${tree.nodes.length}${COPY.layersShowingSuffix}`}
        </div>
      )}
    </div>
  );
};

export { LayersList };
