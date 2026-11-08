import type { LayoutFinding } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface CheckLayoutListProps {
  readonly layout: readonly LayoutFinding[];
}

const CheckLayoutList = ({ layout }: CheckLayoutListProps): ReactElement => (
  <ul className="check-errors check-layout">
    {layout.map((finding) => (
      <li key={`${finding.kind}:${finding.selector}:${finding.detail}`}>
        <strong>{finding.kind}</strong>{" "}
        <code>{finding.source ?? finding.selector}</code>
        {`${copy.colon}${finding.detail}`}
      </li>
    ))}
  </ul>
);

export { CheckLayoutList };
