import type { ReactNode } from "react";

import { Icon } from "./icon.js";

const COPY = {
  dataUse: "Data use",
  details: "Details",
  less: "Less",
} as const;

const LOCK_SIZE = 13;

const DisclosureLabel = ({ isOpen }: { isOpen: boolean }): ReactNode => {
  if (isOpen) {
    return COPY.less;
  }

  return (
    <>
      <span className="disclosure-toggle-wide">{COPY.details}</span>
      <span className="disclosure-toggle-narrow">
        <Icon name="lock" size={LOCK_SIZE} />
        {COPY.dataUse}
      </span>
    </>
  );
};

export { DisclosureLabel };
