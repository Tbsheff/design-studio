import type { ReactElement, ReactNode } from "react";

import { AdvancedSummary } from "./nds-advanced-head.js";

const AdvancedDetails = ({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: ReactNode;
}): ReactElement => {
  if (isOpen) {
    return (
      <details className="nds-advanced" open>
        <summary>
          <AdvancedSummary />
        </summary>
        {children}
      </details>
    );
  }

  return (
    <details className="nds-advanced">
      <summary>
        <AdvancedSummary />
      </summary>
      {children}
    </details>
  );
};

export { AdvancedDetails };
