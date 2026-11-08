import { BrandMark } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ProjectHit } from "./deps.js";
import { MiniRailFoot } from "./mini-rail-foot.js";
import { MiniRailItem } from "./mini-rail-item.js";
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
    <div className="prail-top">
      <BrandMark />
    </div>
    <nav className="prail-thumbs" aria-label={copy.recentProjects}>
      {toMiniHits(hits, projectId).map((hit) => (
        <MiniRailItem key={hit.id} hit={hit} isCurrent={hit.id === projectId} />
      ))}
    </nav>
    <MiniRailFoot showTip={showTip} onNewPrototype={onNewPrototype} />
  </>
);

export { MiniRail };
