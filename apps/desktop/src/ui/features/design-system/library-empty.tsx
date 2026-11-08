import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const LibraryEmpty = ({ onNew }: { onNew: () => void }): ReactElement => (
  <div className="lib-empty">
    <span>{COPY.textMakeOneFromA}</span>
    <button type="button" className="btn small" onClick={onNew}>
      {COPY.textMakeYourFirst}
    </button>
  </div>
);

export { LibraryEmpty };
