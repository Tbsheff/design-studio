import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import type { LayerTree } from "./layers-tree.js";

interface LayersListBodyProps {
  readonly children: ReactNode;
  readonly isSearching: boolean;
  readonly rowCount: number;
  readonly tree: LayerTree | null;
}

const LayersListBody = ({
  children,
  isSearching,
  rowCount,
  tree,
}: LayersListBodyProps): ReactNode => {
  if (tree === null) {
    return (
      <output className="layers-empty">
        <span className="spinner" aria-hidden="true" />
        {COPY.layersReading}
      </output>
    );
  }

  if (rowCount === 0 && isSearching) {
    return <div className="layers-empty">{COPY.layersNoMatches}</div>;
  }

  if (rowCount === 0) {
    return <div className="layers-empty">{COPY.layersEmpty}</div>;
  }

  return children;
};

export { LayersListBody };
