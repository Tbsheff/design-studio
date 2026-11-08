import type { DesignSystemCheckResult } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { CheckFailed } from "./check-failed.js";
import { COPY } from "./copy.js";
import type { Load } from "./use-load.js";

const ICON_SIZE = 14;

const CheckResult = ({
  check,
}: {
  check: Load<DesignSystemCheckResult>;
}): ReactElement => {
  if (check.error) {
    return (
      <div className="alert error small">
        {COPY.textCouldNotRunThe}
        {check.error}
      </div>
    );
  }

  if (!check.value) {
    return (
      <output className="lib-check">
        <span className="spinner" /> {COPY.textChecking}
      </output>
    );
  }

  if (check.value.passed) {
    return (
      <output className="lib-check ok">
        <Icon name="check" size={ICON_SIZE} />
        {COPY.textCheckPassedTokensAa}
      </output>
    );
  }

  return <CheckFailed problems={check.value.problems} />;
};

export { CheckResult };
