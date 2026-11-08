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
import type { DialogFormat } from "./export-formats.js";
import { useExportFlow } from "./use-export-flow.js";
import type { ExportFlow } from "./use-export-flow.js";

interface ExportOptions {
  readonly projectId: string;
  readonly format: DialogFormat;
  readonly flow: ExportFlow;
  readonly scale: ExportScale;
  readonly scope: ExportScope;
  readonly frames: readonly FrameChoice[];
  readonly picked: ReadonlySet<string>;
  readonly chosen: readonly ExportFrame[];
  readonly isSelectionOnly: boolean;
  readonly needsFrames: boolean;
  readonly onChoose: (next: DialogFormat) => void;
  readonly onChooseScale: (next: ExportScale) => void;
  readonly onChooseScope: (next: ExportScope) => void;
  readonly onToggle: (id: string) => void;
}

const toSavedFormat = (
  format: DialogFormat,
  saved: ExportFormat
): ExportFormat => {
  if (format === "flow") {
    return saved;
  }

  return format;
};

const toInitialFormat = (
  target: ExportTarget,
  initial: ExportPrefs
): DialogFormat => {
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

  const [format, setFormat] = useState<DialogFormat>(() =>
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

  const flow = useExportFlow();

  const prefs: ExportPrefs = {
    format: toSavedFormat(format, initial.format),
    scale,
    scope,
  };

  const onChoose = (next: DialogFormat): void => {
    setFormat(next);
    saveExportPrefs({ ...prefs, format: toSavedFormat(next, prefs.format) });
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
  const needsFrames = format !== "zip" && format !== "flow" && !isSelectionOnly;

  return {
    chosen,
    flow,
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
