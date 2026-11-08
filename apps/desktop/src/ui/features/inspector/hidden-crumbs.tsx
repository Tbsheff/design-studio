import { useCallback } from "react";
import type { ReactElement } from "react";

import type { PathCrumb } from "./authored-css.js";
import { copy } from "./copy.js";
import { CrumbSeparator } from "./crumb-separator.js";

interface HiddenCrumbsProps {
  readonly hidden: PathCrumb[];
  readonly onSelect: (levels: number) => void;
}

const HiddenCrumbs = ({
  hidden,
  onSelect,
}: HiddenCrumbsProps): ReactElement | null => {
  const nearest = hidden.at(-1);
  const levels = nearest?.levels ?? 0;
  const handleSelect = useCallback(() => onSelect(levels), [onSelect, levels]);

  if (!nearest) {
    return null;
  }

  return (
    <>
      <li>
        <button
          type="button"
          className="ins-crumb gap"
          aria-label={`Select ${nearest.label}`}
          data-tip={hidden.map((entry) => entry.label).join(" › ")}
          data-tip-align="start"
          onClick={handleSelect}
        >
          {copy.text2}
        </button>
      </li>
      <CrumbSeparator />
    </>
  );
};

export { HiddenCrumbs };
