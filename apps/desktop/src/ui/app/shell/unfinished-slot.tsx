import { Suspense } from "react";
import type { ReactElement } from "react";

import { UnfinishedBanner } from "../../features/chat/index.js";

interface UnfinishedSlotProps {
  visible: boolean;
  count: number;
  busy: boolean;
  runStopped: boolean;
  onKeep: () => void;
  onDiscard: () => void;
}

const UnfinishedSlot = (props: UnfinishedSlotProps): ReactElement | null => {
  if (!props.visible) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <UnfinishedBanner
        count={props.count}
        busy={props.busy}
        runStopped={props.runStopped}
        onKeep={props.onKeep}
        onDiscard={props.onDiscard}
      />
    </Suspense>
  );
};

export { UnfinishedSlot };
