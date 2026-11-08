import type { Direction, Version } from "@design-studio/contracts";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { onOpenExport } from "./export-api.js";
import type { ExportTarget, OpenExportDetail } from "./export-api.js";

interface ExportTargetState {
  canOpen: boolean;
  close: () => void;
  open: (detail?: OpenExportDetail) => void;
  openHead: () => void;
  target: ExportTarget | null;
}

const toOptionalTarget = (
  detail: OpenExportDetail
): Pick<ExportTarget, "format" | "selector"> => {
  const optional: Pick<ExportTarget, "format" | "selector"> = {};

  if (detail.selector) {
    optional.selector = detail.selector;
  }

  if (detail.format) {
    optional.format = detail.format;
  }

  return optional;
};

const toVersionLabel = (match: Version | null): string => {
  if (match) {
    return match.name ?? match.title;
  }

  return "Newest version";
};

const useExportTarget = (
  projectId: string,
  direction: Direction | null,
  versions: Version[]
): ExportTargetState => {
  const [target, setTarget] = useState<ExportTarget | null>(null);
  const latest = useRef({ direction, versions });

  useLayoutEffect(() => {
    latest.current = { direction, versions };
  }, [direction, versions]);

  const open = useCallback(
    (detail: OpenExportDetail = {}) => {
      const { direction: current, versions: list } = latest.current;
      const versionId = detail.versionId ?? current?.headVersionId ?? null;

      if (!versionId) {
        return;
      }

      const match = list.find((item) => item.id === versionId) ?? null;

      setTarget({
        directionId: current?.id ?? null,
        projectId,
        versionId,
        versionLabel: toVersionLabel(match),
        ...toOptionalTarget(detail),
      });
    },
    [projectId]
  );

  useEffect(() => onOpenExport(open), [open]);

  const close = useCallback(() => {
    setTarget(null);
  }, []);

  const openHead = useCallback(() => {
    open();
  }, [open]);

  const canOpen = Boolean(direction?.headVersionId);

  return { canOpen, close, open, openHead, target };
};

export { useExportTarget };
