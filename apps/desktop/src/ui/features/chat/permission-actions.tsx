import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const PermissionActions = ({
  rule,
  isDisabled,
  onAllow,
  onAlways,
  onDenyStart,
}: {
  rule: string | null;
  isDisabled: boolean;
  onAllow: () => void;
  onAlways: (rule: string) => void;
  onDenyStart: () => void;
}): ReactElement => {
  const onAlwaysClick = useCallback(() => {
    if (rule) {
      onAlways(rule);
    }
  }, [rule, onAlways]);

  return (
    <div className="permission-actions">
      <button
        type="button"
        className="btn small primary"
        disabled={isDisabled}
        onClick={onAllow}
      >
        {copy.allowOnce}
      </button>
      {rule && (
        <button
          type="button"
          className="btn small permission-always"
          disabled={isDisabled}
          data-tip={rule}
          aria-label={`Always allow ${rule}`}
          onClick={onAlwaysClick}
        >
          {copy.always}
          <code className="permission-rule">{rule}</code>
        </button>
      )}
      <button
        type="button"
        className="btn small"
        disabled={isDisabled}
        onClick={onDenyStart}
      >
        {copy.deny2}
      </button>
    </div>
  );
};

export { PermissionActions };
