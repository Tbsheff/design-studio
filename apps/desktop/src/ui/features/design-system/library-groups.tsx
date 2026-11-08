import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { LibraryGroup } from "./library-group.js";

const LibraryGroups = ({
  builtin,
  onNew,
  onOpen,
  packs,
  yours,
}: {
  builtin: PackSummary[];
  onNew: () => void;
  onOpen: (pack: PackSummary) => void;
  packs: PackSummary[] | null;
  yours: PackSummary[];
}): ReactElement => {
  if (packs === null) {
    return <div className="lib-grid skeleton" aria-hidden="true" />;
  }

  return (
    <>
      <LibraryGroup
        title={COPY.titleYours}
        packs={yours}
        onOpen={onOpen}
        onNew={onNew}
      />
      <LibraryGroup
        title={COPY.titleBuiltIn}
        packs={builtin}
        onOpen={onOpen}
        onNew={null}
      />
    </>
  );
};

export { LibraryGroups };
