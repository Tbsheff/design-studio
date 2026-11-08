import type { PackSummary } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { PackSwatches } from "./nds-pack-swatches.js";

const Preset = ({
  pack,
  isPressed,
  onChange,
}: {
  pack: PackSummary;
  isPressed: boolean;
  onChange: (id: string) => void;
}): ReactElement => {
  const { id } = pack;
  const selectPack = useCallback((): void => onChange(id), [id, onChange]);

  return (
    <button
      type="button"
      className="nds-preset"
      aria-pressed={isPressed}
      onClick={selectPack}
    >
      <PackSwatches pack={pack} />
      <span className="truncate">{pack.name}</span>
    </button>
  );
};

export { Preset };
