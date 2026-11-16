import type { ShipResult } from "@design-studio/contracts/ship";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";

type ShipFormat = NonNullable<ShipResult["format"]>;

interface ShipFormatWarningProps {
  readonly format: ShipFormat;
}

const ShipFormatWarning = ({
  format,
}: ShipFormatWarningProps): ReactElement => {
  const isSingle = format.errors.length === 1;
  const paths = format.errors.map((entry) => entry.path).join(", ");

  const verb = pick(isSingle, copy.soItShips, copy.soTheyShip);
  const pronoun = pick(isSingle, copy.itWord, copy.themWord);

  return (
    <div className="alert warn small" role="alert">
      {`${format.tool} ${copy.couldNotFormat} ${paths}, ${verb} ${copy.asTheStudioWrote} ${pronoun}.`}
    </div>
  );
};

export { ShipFormatWarning };
