import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const DmdTitle = ({ isDirty }: { isDirty: boolean }): ReactElement => (
  <h2>
    {COPY.labelDesignMd}
    {isDirty && <span className="dmd-dirty">{COPY.textUnsaved}</span>}
  </h2>
);

export { DmdTitle };
