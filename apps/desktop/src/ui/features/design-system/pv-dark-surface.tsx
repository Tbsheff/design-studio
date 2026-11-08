import type { CompiledTokenEntry } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { PvSurface } from "./pv-surface.js";

const PvDarkSurface = ({
  entries,
  isShown,
  name,
}: {
  entries: CompiledTokenEntry[];
  isShown: boolean;
  name: string;
}): ReactElement | null => {
  if (!isShown) {
    return null;
  }

  return <PvSurface entries={entries} mode="dark" label="Dark" name={name} />;
};

export { PvDarkSurface };
