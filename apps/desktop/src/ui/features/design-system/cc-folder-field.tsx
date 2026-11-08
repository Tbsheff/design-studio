import type { ReactElement, ReactNode } from "react";

import { COPY } from "./copy.js";

const CcFolderField = ({ children }: { children: ReactNode }): ReactElement => (
  <div className="field">
    <span id="cc-folder-label">{COPY.labelFolder}</span>
    {children}
  </div>
);

export { CcFolderField };
