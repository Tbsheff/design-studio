import type {
  ExportFormat,
  ExportFrame,
  ExportScale,
  ExportScope,
} from "@design-studio/contracts/export";
import { useCallback, useMemo, useState } from "react";

import {
  canvasFrameChoices,
  readExportPrefs,
  saveExportPrefs,
} from "./export-api.js";
import type { ExportPrefs, ExportTarget, FrameChoice } from "./export-api.js";

interface ExportOptions {
  readonly projectId: string;
  readonly format: ExportFormat;
  readonly scale: ExportScale;
  readonly scope: ExportScope;
  readonly frames: readonly FrameChoice[];
  readonly picked: ReadonlySet<string>;
  readonly chosen: readonly ExportFrame[];
  readonly isSelectionOnly: boolean;
  readonly needsFrames: boolean;
  readonly onChoose: (next: ExportFormat) => void;
  readonly onChooseScale: (next: ExportScale) => void;
  readonly onChooseScope: (next: ExportScope) => void;
  readonly onToggle: (id: string) => void;
}

const toInitialFormat = (
  target: ExportTarget,
  initial: ExportPrefs
): ExportFormat => {
  if (target.format) {
    return target.format;
  }

  if (target.selector) {
    return "png";
  }

  return initial.format;
};

const toggleInSet = (
  previous: ReadonlySet<string>,
  id: string
): Set<string> => {
  const next = new Set(previous);

  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }

  return next;
};

const toChosenFrames = (
  frames: readonly FrameChoice[],
  picked: ReadonlySet<string>
): ExportFrame[] => {
  const chosen: ExportFrame[] = [];

  for (const choice of frames) {
    if (picked.has(choice.id)) {
      chosen.push(choice.frame);
    }
  }

  return chosen;
};

const useExportOptions = (target: ExportTarget): ExportOptions => {
  const initial = useMemo(() => readExportPrefs(), []);

  const [format, setFormat] = useState<ExportFormat>(() =>
    toInitialFormat(target, initial)
  );

  const [scale, setScale] = useState<ExportScale>(initial.scale);
  const [scope, setScope] = useState<ExportScope>(initial.scope);
  const { projectId } = target;

  const frames = useMemo(
    () => canvasFrameChoices(target.projectId, target.directionId),
    [target.projectId, target.directionId]
  );

  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(frames.map((frame) => frame.id))
  );

  const isSelectionOnly =
    Boolean(target.selector) && (format === "png" || format === "svg");

  const prefs: ExportPrefs = { format, scale, scope };

  const onChoose = (next: ExportFormat): void => {
    setFormat(next);
    saveExportPrefs({ ...prefs, format: next });
  };

  const onChooseScale = (next: ExportScale): void => {
    setScale(next);
    saveExportPrefs({ ...prefs, scale: next });
  };

  const onChooseScope = (next: ExportScope): void => {
    setScope(next);
    saveExportPrefs({ ...prefs, scope: next });
  };

  const onToggle = useCallback((id: string): void => {
    setPicked((previous) => toggleInSet(previous, id));
  }, []);

  const chosen = toChosenFrames(frames, picked);
  const needsFrames = format !== "zip" && !isSelectionOnly;

  return {
    chosen,
    format,
    frames,
    isSelectionOnly,
    needsFrames,
    onChoose,
    onChooseScale,
    onChooseScope,
    onToggle,
    picked,
    projectId,
    scale,
    scope,
  };
};

export { useExportOptions };

export type { ExportOptions };
