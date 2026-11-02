import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { SelectionContext } from "./deps.js";
import { placeHintOf } from "./image-search-model.js";

interface SheetHeadProps {
  readonly hintId: string;
  readonly target: SelectionContext;
}

const SheetHead = ({ hintId, target }: SheetHeadProps): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2>{copy.find}</h2>
      <p id={hintId}>
        {copy.hint} {placeHintOf(target)}
      </p>
    </div>
  </div>
);

export { SheetHead };
