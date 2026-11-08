import type { PortKitMatch } from "@design-studio/contracts/port";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const KitChips = ({ kit }: { kit: PortKitMatch[] }): ReactElement => {
  if (kit.length === 0) {
    return <span>{COPY.textNoKitComponentFits}</span>;
  }

  return (
    <>
      {kit.map((match) => (
        <span
          key={match.role}
          className="port-kit-chip"
          data-tip={match.reason}
        >
          {match.name}
        </span>
      ))}
    </>
  );
};

export { KitChips };
