import { useCallback } from "react";
import type { ReactElement } from "react";

import type { PathCrumb } from "./authored-css-model.js";
import { CrumbSeparator } from "./crumb-separator.js";

interface CrumbButtonProps {
  readonly crumb: PathCrumb;
  readonly onSelect: (levels: number) => void;
}

const CrumbButton = ({ crumb, onSelect }: CrumbButtonProps): ReactElement => {
  const handleSelect = useCallback(
    () => onSelect(crumb.levels),
    [onSelect, crumb.levels]
  );

  return (
    <>
      <li>
        <button
          type="button"
          className="ins-crumb"
          data-tip={`Select ${crumb.label}`}
          onClick={handleSelect}
        >
          {crumb.label}
        </button>
      </li>
      <CrumbSeparator />
    </>
  );
};

export { CrumbButton };
