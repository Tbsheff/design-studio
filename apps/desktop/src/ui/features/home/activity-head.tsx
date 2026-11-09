import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toDataFlag } from "./data-flag-model.js";

const ActivityHead = ({ isOff }: { readonly isOff: boolean }): ReactElement => (
  <div className="ide-act-head">
    <h2>{copy.activity}</h2>
    <span className="ide-live" data-off={toDataFlag(isOff)}>
      <i />
      {copy.live}
    </span>
  </div>
);

export { ActivityHead };
