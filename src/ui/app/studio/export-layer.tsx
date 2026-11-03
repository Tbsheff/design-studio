import { lazy, Suspense } from "react";
import type { ReactNode } from "react";

import type { ExportTarget } from "../../exportApi";

const ExportDialog = lazy(async () => {
  const loaded = await import("../../components/ExportDialog");

  return { default: loaded.ExportDialog };
});

interface ExportLayerProps {
  target: ExportTarget | null;
  onClose: () => void;
}

const ExportLayer = ({ target, onClose }: ExportLayerProps): ReactNode => {
  if (!target) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ExportDialog target={target} onClose={onClose} />
    </Suspense>
  );
};

export { ExportLayer };
