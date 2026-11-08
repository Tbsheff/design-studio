import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { LibraryCard } from "./library-card.js";
import { LibraryEmpty } from "./library-empty.js";

const LibraryGroupBody = ({
  onNew,
  onOpen,
  packs,
}: {
  onNew: (() => void) | null;
  onOpen: (pack: PackSummary) => void;
  packs: PackSummary[];
}): ReactElement => {
  if (packs.length === 0 && onNew) {
    return <LibraryEmpty onNew={onNew} />;
  }

  return (
    <ul className="lib-grid">
      {packs.map((pack) => (
        <LibraryCard key={pack.id} pack={pack} onOpen={onOpen} />
      ))}
    </ul>
  );
};

export { LibraryGroupBody };
