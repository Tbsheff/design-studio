import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";

interface ShipFactProps {
  readonly label: string;
  readonly value: string | number;
  readonly isMono: boolean;
  readonly tip: string | null;
}

const ShipFact = ({
  isMono,
  label,
  tip,
  value,
}: ShipFactProps): ReactElement => (
  <>
    <dt>{label}</dt>
    <dd className={pick(isMono, "mono", "")} data-tip={tip}>
      {value}
    </dd>
  </>
);

export { ShipFact };
