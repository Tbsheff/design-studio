import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { Keys } from "./keys.js";

const PaletteFoot = (): ReactElement => (
  <footer className="cmdk-foot" aria-hidden="true">
    <span>
      <kbd>{copy.textGlyph2}</kbd>
      <kbd>{copy.textGlyph3}</kbd>
      {` ${copy.textMove}`}
    </span>
    <span>
      <kbd>{copy.textGlyph4}</kbd>
      {` ${copy.textOpen}`}
    </span>
    <span>
      <kbd>{copy.textEsc}</kbd>
      {` ${copy.textClose}`}
    </span>
    <span className="cmdk-foot-end">
      <Keys keys="?" />
      {` ${copy.textAllShortcuts}`}
    </span>
  </footer>
);

export { PaletteFoot };
