import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { Preset } from "./nds-preset.js";
import { pickable, usePacks } from "./packs.js";

const Presets = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}): ReactElement | null => {
  const { packs } = pickable(usePacks());

  if (!packs) {
    return null;
  }

  return (
    <fieldset className="nds-presets" aria-label={COPY.labelStartFrom}>
      {packs.map((pack) => (
        <Preset
          key={pack.id}
          pack={pack}
          isPressed={pack.id === value}
          onChange={onChange}
        />
      ))}
    </fieldset>
  );
};

export { Presets };
