import type { DesignSystemCheckResult } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { CheckResult } from "./check-result.js";
import { COPY } from "./copy.js";
import type { Load } from "./use-load.js";

const CheckSection = ({
  check,
}: {
  check: Load<DesignSystemCheckResult>;
}): ReactElement => (
  <section className="lib-detail-section" aria-label={COPY.labelCheck}>
    <h3>{COPY.labelCheck}</h3>
    <CheckResult check={check} />
  </section>
);

export { CheckSection };
