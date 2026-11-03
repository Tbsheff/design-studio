import { Suspense } from "react";
import type { ReactNode } from "react";

import { ShipDialog } from "../../features/share-publish-ship-export/index.js";

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
