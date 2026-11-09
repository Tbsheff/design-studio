import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { UiSelect } from "./deps.js";
import type { LinkPlacement, PrototypeLink } from "./deps.js";
import {
  outsideCloseOf,
  outsideCloseOptions,
  placementOf,
  placementOptions,
} from "./interaction-model.js";
import type { OutsideCloseValue } from "./interaction-model.js";
import type { Interaction } from "./use-link-interaction.js";

interface PlacementFieldProps {
  readonly interaction: Interaction;
  readonly link: PrototypeLink;
}

const PlacementField = ({
  interaction,
  link,
}: PlacementFieldProps): ReactElement => {
  const { handleSend } = interaction;

  const handlePlacement = useCallback(
    (placement: LinkPlacement): void =>
      handleSend({ action: "popover", placement }),
    [handleSend]
  );

  const handleOutside = useCallback(
    (value: OutsideCloseValue): void =>
      handleSend({ action: "popover", isOutsideClose: value === "close" }),
    [handleSend]
  );

  return (
    <>
      <UiSelect
        aria-label={copy.placement}
        options={placementOptions}
        value={placementOf(link)}
        onChange={handlePlacement}
      />
      <UiSelect
        aria-label={copy.outsideClose}
        options={outsideCloseOptions}
        value={outsideCloseOf(link)}
        onChange={handleOutside}
      />
    </>
  );
};

export { PlacementField };

export type { PlacementFieldProps };
