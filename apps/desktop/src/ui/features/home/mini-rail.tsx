import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ProjectHit } from "./deps.js";
import { MiniRailFoot } from "./mini-rail-foot.js";
import { MiniRailItem } from "./mini-rail-item.js";
import { MiniRailToggle } from "./mini-rail-toggle.js";
import { toMiniHits } from "./rail-model.js";

interface MiniRailProps {
  readonly hits: readonly ProjectHit[];
  readonly projectId: string;
  readonly showTip: string;
  readonly onNewPrototype: () => void;
}

const MiniRail = ({
  hits,
  projectId,
  showTip,
  onNewPrototype,
}: MiniRailProps): ReactElement => (
  <>
    <MiniRailToggle showTip={showTip} />
    <nav className="prail-thumbs" aria-label={copy.recentProjects}>
      {toMiniHits(hits, projectId).map((hit) => (
        <MiniRailItem key={hit.id} hit={hit} isCurrent={hit.id === projectId} />
      ))}
    </nav>
    <MiniRailFoot onNewPrototype={onNewPrototype} />
  </>
);

export { MiniRail };
