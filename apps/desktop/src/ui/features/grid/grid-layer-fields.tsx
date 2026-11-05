import type { ReactElement } from "react";

import type { GridInfo } from "./deps.js";
import type { GridAxis } from "./grid-model.js";
import { GridTracksField } from "./grid-tracks-field.js";

interface GridLayerFieldsProps {
  readonly columns: string;
  readonly disabled: boolean;
  readonly info: GridInfo;
  readonly rows: string;
  readonly onCommit: (axis: GridAxis, text: string | null) => void;
}

const GridLayerFields = ({
  columns,
  disabled,
  info,
  rows,
  onCommit,
}: GridLayerFieldsProps): ReactElement => (
  <>
    <GridTracksField
      axis="columns"
      computed={columns}
      disabled={disabled}
      info={info}
      onCommit={onCommit}
    />
    <GridTracksField
      axis="rows"
      computed={rows}
      disabled={disabled}
      info={info}
      onCommit={onCommit}
    />
  </>
);

export { GridLayerFields };

export type { GridLayerFieldsProps };
