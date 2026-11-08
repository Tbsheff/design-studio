import type { ReactElement } from "react";

import { LayerStylePicker } from "./layer-style-picker.js";
import type { LayerStyleHost } from "./use-layer-style-host.js";

interface LayerStyleSlotProps {
  readonly host: LayerStyleHost;
}

const LayerStyleSlot = ({ host }: LayerStyleSlotProps): ReactElement | null => {
  if (!host.opened) {
    return null;
  }

  return <LayerStylePicker host={host} />;
};

export { LayerStyleSlot };

export type { LayerStyleSlotProps };
