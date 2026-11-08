import type { ReactElement } from "react";

import { useLive } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import { FreeMoveLayer } from "./free-move-layer.js";
import type { FreeMoveView } from "./use-free-move.js";

interface FreeMoveSlotProps {
  readonly view: LiveStore<FreeMoveView | null>;
}

const FreeMoveSlot = ({ view }: FreeMoveSlotProps): ReactElement => {
  const current = useLive(view);

  return <FreeMoveLayer view={current} />;
};

export { FreeMoveSlot };
