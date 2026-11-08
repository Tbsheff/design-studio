import type { Version } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { displayTitle } from "./version-labels.js";
import type { VersionIndex } from "./version-labels.js";

interface VersionLinkProps {
  readonly index: VersionIndex;
  readonly label: string;
  readonly onOpen: (version: Version) => void;
  readonly target: Version;
}

const VersionLink = ({
  index,
  label,
  onOpen,
  target,
}: VersionLinkProps): ReactNode => {
  const handleOpenTarget = useCallback((): void => {
    onOpen(target);
  }, [onOpen, target]);

  return (
    <div className="version-fact">
      <dt>{label}</dt>
      <dd>
        <button type="button" className="link" onClick={handleOpenTarget}>
          {displayTitle(target, index)}
        </button>
      </dd>
    </div>
  );
};

export { VersionLink };
