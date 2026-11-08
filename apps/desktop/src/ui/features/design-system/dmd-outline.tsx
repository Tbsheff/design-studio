import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import type { OutlineItem } from "./design-md-outline.js";
import { DmdOutlineList } from "./dmd-outline-list.js";

const DmdOutline = ({
  items,
  onJump,
}: {
  items: OutlineItem[];
  onJump: (item: OutlineItem, index: number) => void;
}): ReactElement => (
  <nav className="dmd-outline" aria-label={COPY.labelOutline}>
    <p className="dmd-pane-label">{COPY.labelOutline}</p>
    <DmdOutlineList items={items} onJump={onJump} />
  </nav>
);

export { DmdOutline };
