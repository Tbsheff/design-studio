import type { Direction, Version } from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import { onOpenExport } from "./export-api.js";
import type { ExportTarget, OpenExportDetail } from "./export-api.js";

function useExportTarget(
  projectId: string,
  direction: Direction | null,
  versions: Version[]
) {
  const [target, setTarget] = useState<ExportTarget | null>(null);
  const latest = useRef({ direction, versions });
  latest.current = { direction, versions };

  const open = useCallback(
    (detail: OpenExportDetail = {}) => {
      const { direction: current, versions: list } = latest.current;
      const versionId = detail.versionId ?? current?.headVersionId ?? null;

      if (!versionId) {
        return;
      }

      const version = list.find((v) => v.id === versionId);
      setTarget({
        directionId: current?.id ?? null,
        projectId,
        versionId,
        versionLabel: version
          ? (version.name ?? version.title)
          : "Newest version",
        ...(detail.selector ? { selector: detail.selector } : {}),
        ...(detail.format ? { format: detail.format } : {}),
      });
    },
    [projectId]
  );

  useEffect(() => onOpenExport(open), [open]);
  const close = useCallback(() => setTarget(null), []);

  return {
    canOpen: Boolean(direction?.headVersionId),
    close,
    open,
    openHead: () => open(),
    target,
  };
}

export { useExportTarget };
