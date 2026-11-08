import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { toDescription } from "./create-component-model.js";

const CcHead = ({ count }: { count: number }): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2>{COPY.labelCreateComponent}</h2>
      <p>{toDescription(count)}</p>
    </div>
  </div>
);

export { CcHead };
