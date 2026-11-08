import type { CompiledTokenEntry } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useMemo } from "react";

import { toVars } from "./preview-model.js";
import type { PreviewMode } from "./preview-model.js";
import { PvComponents } from "./pv-components.js";
import { PvPalette } from "./pv-palette.js";

const PvSurface = ({
  entries,
  label,
  mode,
  name,
}: {
  entries: CompiledTokenEntry[];
  label: string;
  mode: PreviewMode;
  name: string;
}): ReactElement => {
  const vars = useMemo(() => toVars(entries, mode), [entries, mode]);

  return (
    <section
      className="pv-surface"
      style={vars}
      aria-label={label}
      data-mode={mode}
    >
      <span className="pv-label">{label}</span>
      <PvPalette />
      <PvComponents name={name} />
    </section>
  );
};

export { PvSurface };
