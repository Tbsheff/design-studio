import type { ReactElement } from "react";

import { copy } from "./copy.js";

const DevNotePanel = (): ReactElement => (
  <ul className="ui-menu">
    <li>{copy.title}</li>
  </ul>
);

export { DevNotePanel };
