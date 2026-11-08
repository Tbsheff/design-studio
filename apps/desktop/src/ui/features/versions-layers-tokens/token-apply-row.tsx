import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { COPY } from "./copy.js";

interface TokenApplyRowProps {
  readonly isApplied: boolean;
  readonly onApply: (value: boolean) => void;
}

const TokenApplyRow = ({
  isApplied,
  onApply,
}: TokenApplyRowProps): ReactNode => {
  const handleApplyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onApply(event.target.checked);
    },
    [onApply]
  );

  return (
    <label className="check tk-check-row">
      <input
        type="checkbox"
        name="token-apply"
        checked={isApplied}
        onChange={handleApplyChange}
      />
      <span>{COPY.tokenApply}</span>
    </label>
  );
};

export { TokenApplyRow };
