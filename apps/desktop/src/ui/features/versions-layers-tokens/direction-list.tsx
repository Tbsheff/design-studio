import type { Direction } from "@design-studio/contracts";
import type { ReactNode } from "react";

import { DirectionItem } from "./direction-item.js";

interface DirectionListProps {
  readonly directionId: string | null;
  readonly directions: Direction[];
  readonly onSelect: (id: string) => void;
}

const DirectionList = ({
  directionId,
  directions,
  onSelect,
}: DirectionListProps): ReactNode => (
  <ul className="list dir-list">
    {directions.map((dir) => (
      <DirectionItem
        key={dir.id}
        dir={dir}
        isSelected={dir.id === directionId}
        onSelect={onSelect}
      />
    ))}
  </ul>
);

export { DirectionList };
