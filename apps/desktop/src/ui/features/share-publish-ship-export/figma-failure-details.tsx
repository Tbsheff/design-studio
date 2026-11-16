import { Icon } from "@design-studio/ui";
import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";

const CHEVRON_SIZE = 12;

interface Props {
  readonly details: string;
}

const FigmaFailureDetails = ({ details }: Props): ReactElement => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback((): void => {
    setIsOpen((previous) => !previous);
  }, []);

  return (
    <>
      <button
        type="button"
        className="fgi-details-toggle"
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        <Icon
          name={pick(isOpen, "chevronDown", "chevronRight")}
          size={CHEVRON_SIZE}
        />
        {copy.details}
      </button>
      {isOpen && <p className="fgi-details">{details}</p>}
    </>
  );
};

export { FigmaFailureDetails };
