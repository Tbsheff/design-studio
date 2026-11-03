import { Suspense } from "react";
import type { ReactNode } from "react";

import { RulesEditor } from "../../features/review/index.js";

interface RulesSlotProps {
  projectId: string;
  directionId: string | null;
}

const RulesSlot = ({ projectId, directionId }: RulesSlotProps): ReactNode => {
  if (!directionId) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <RulesEditor
        key={directionId}
        projectId={projectId}
        directionId={directionId}
      />
    </Suspense>
  );
};

export { RulesSlot };
