import type { CanvasSection } from "@design-studio/contracts/canvas-file";
import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { startSectionDrag } from "./section-drag.js";
import {
  toMovedEdit,
  toRemovedEdit,
  toRenamedEdit,
  toResizedEdit,
} from "./section-model.js";
import type { SectionHandle } from "./section-model.js";
import type { CanvasSectionsApi } from "./use-canvas-sections.js";

interface SectionHandlers {
  readonly remove: () => void;
  readonly rename: (raw: string) => void;
  readonly startMove: (event: ReactPointerEvent<HTMLElement>) => void;
  readonly startResize: (event: ReactPointerEvent<HTMLElement>) => void;
}

const useSectionHandlers = (
  api: CanvasSectionsApi,
  section: CanvasSection,
  view: { readonly freeze: () => void; readonly zoom: number }
): SectionHandlers => {
  const { freeze, zoom } = view;

  const startMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void => {
      const base = api.snapshot();
      freeze();

      startSectionDrag(event, zoom, (delta, isFinal) =>
        api.apply(
          toMovedEdit(base.layout, base.sections, section, delta),
          isFinal
        )
      );
    },
    [api, section, zoom, freeze]
  );

  const startResize = useCallback(
    (event: ReactPointerEvent<HTMLElement>): void => {
      const handle = event.currentTarget.dataset.handle as SectionHandle;
      const base = api.snapshot();

      startSectionDrag(event, zoom, (delta, isFinal) =>
        api.apply(toResizedEdit(base.sections, section, handle, delta), isFinal)
      );
    },
    [api, section, zoom]
  );

  const remove = useCallback((): void => {
    api.apply(toRemovedEdit(api.snapshot().sections, section.id), true);
  }, [api, section.id]);

  const rename = useCallback(
    (raw: string): void => {
      api.apply(toRenamedEdit(api.snapshot().sections, section, raw), true);
    },
    [api, section]
  );

  return { remove, rename, startMove, startResize };
};

export { useSectionHandlers };

export type { SectionHandlers };
