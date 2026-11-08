import type { ShipFile } from "@design-studio/contracts/ship";
import type { ReactElement } from "react";

interface ShipCountsProps {
  readonly file: ShipFile;
}

const ShipCounts = ({ file }: ShipCountsProps): ReactElement => (
  <span className="ship-counts">
    {file.additions !== null && (
      <span className="add">{`+${file.additions}`}</span>
    )}
    {file.deletions !== null && (
      <span className="del">{`−${file.deletions}`}</span>
    )}
  </span>
);

export { ShipCounts };
