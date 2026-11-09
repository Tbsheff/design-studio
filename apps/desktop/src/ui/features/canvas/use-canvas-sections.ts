import type { CanvasSection } from "@design-studio/contracts/canvas-file";
import { useMemo } from "react";

import { uiStore } from "../../platform/storage.js";
import { defaultLayout } from "./canvas-frame-ops.js";
import { canvasStore, useCanvasSectionList } from "./canvas-frames-model.js";
import type { CanvasLayout } from "./canvas-frames-model.js";
import { toSectionAround } from "./section-model.js";
import type { SectionEdit } from "./section-model.js";

interface SectionBase {
  readonly layout: CanvasLayout;
  readonly sections: CanvasSection[];
}

interface CanvasSectionsApi {
  readonly apply: (edit: SectionEdit, isFinal: boolean) => void;
  readonly sections: CanvasSection[];
  readonly snapshot: () => SectionBase;
}

const toBase = (projectId: string): SectionBase => ({
  layout: canvasStore.get(projectId) ?? defaultLayout(uiStore.get().viewport),
  sections: canvasStore.sections(projectId),
});

const addSectionAround = (
  projectId: string,
  frameIds: readonly string[]
): boolean => {
  const base = toBase(projectId);

  const wanted = new Set(frameIds);

  const section = toSectionAround(
    base.sections,
    base.layout.frames.filter((frame) => wanted.has(frame.id))
  );

  if (section === null) {
    return false;
  }

  canvasStore.setSections(
    projectId,
    { layout: base.layout, sections: [...base.sections, section] },
    true
  );

  return true;
};

const useCanvasSections = (projectId: string): CanvasSectionsApi => {
  const list = useCanvasSectionList(projectId);

  return useMemo(
    () => ({
      apply: (edit, isFinal) =>
        canvasStore.setSections(projectId, edit, isFinal),
      sections: list,
      snapshot: () => toBase(projectId),
    }),
    [projectId, list]
  );
};

export { addSectionAround, useCanvasSections };

export type { CanvasSectionsApi, SectionBase };
