import { useMemo, useState } from "react";
import type { ReactElement, RefObject } from "react";

import type { ProjectHit } from "./deps.js";
import { OpenRailFoot } from "./open-rail-foot.js";
import { OpenRailHead } from "./open-rail-head.js";
import { RailFind } from "./rail-find.js";
import { RailList } from "./rail-list.js";
import { toFilteredHits } from "./rail-model.js";

interface OpenRailProps {
  readonly hits: readonly ProjectHit[];
  readonly projectId: string;
  readonly collapseTip: string;
  readonly onHome: () => void;
  readonly onNewPrototype: () => void;
  readonly find: RefObject<HTMLInputElement | null>;
}

const OpenRail = ({
  hits,
  projectId,
  collapseTip,
  onHome,
  onNewPrototype,
  find,
}: OpenRailProps): ReactElement => {
  const [filter, setFilter] = useState("");
  const shown = useMemo(() => toFilteredHits(hits, filter), [hits, filter]);

  return (
    <>
      <OpenRailHead collapseTip={collapseTip} />
      <RailFind
        find={find}
        filter={filter}
        first={shown[0] ?? null}
        onFilter={setFilter}
      />
      <RailList shown={shown} projectId={projectId} filter={filter} />
      <OpenRailFoot onHome={onHome} onNewPrototype={onNewPrototype} />
    </>
  );
};

export { OpenRail };
