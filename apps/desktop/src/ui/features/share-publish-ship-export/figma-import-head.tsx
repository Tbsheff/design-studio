import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface Props {
  readonly fileName: string | null;
}

const FigmaImportHead = ({ fileName }: Props): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2>{copy.importFigmaFrame}</h2>
      <p>
        {fileName && `From ${fileName}. `}
        {copy.autoLayoutBecomesFlex}
      </p>
    </div>
  </div>
);

export { FigmaImportHead };
