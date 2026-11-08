import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { LibrarySpecimen } from "./library-specimen.js";
import { LibraryText } from "./library-text.js";

const LibraryCard = ({
  onOpen,
  pack,
}: {
  onOpen: (pack: PackSummary) => void;
  pack: PackSummary;
}): ReactElement => {
  const open = useCallback(() => onOpen(pack), [onOpen, pack]);

  return (
    <li>
      <button
        type="button"
        className="lib-card"
        aria-label={pack.name}
        onClick={open}
      >
        <LibrarySpecimen pack={pack} />
        <LibraryText pack={pack} />
      </button>
    </li>
  );
};

export { LibraryCard };
