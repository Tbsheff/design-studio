import { lazy, Suspense } from "react";
import type { ReactNode } from "react";

const ShipDialog = lazy(() => import("../../components/ShipDialog"));

interface ShipLayerProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

const ShipLayer = ({ projectId, open, onClose }: ShipLayerProps): ReactNode => {
  if (!open) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ShipDialog projectId={projectId} onClose={onClose} />
    </Suspense>
  );
};

export { ShipLayer };
