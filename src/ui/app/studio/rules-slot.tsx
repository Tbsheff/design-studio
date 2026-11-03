import { lazy, Suspense } from "react";
import type { ReactNode } from "react";

const RulesEditor = lazy(() => import("../../components/RulesEditor"));

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
