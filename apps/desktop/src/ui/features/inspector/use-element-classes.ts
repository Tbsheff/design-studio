import type { SourceLoc } from "@design-studio/contracts";
import { startTransition, useEffect, useMemo, useState } from "react";

import { api } from "../../api.js";
import type { ElementClasses } from "./element-classes-model.js";

interface ClassesTarget {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly source: SourceLoc | null;
  readonly savedAt: number;
  readonly variant: string;
}

interface ClassesRequest {
  readonly projectId: string;
  readonly directionId: string;
  readonly file: string;
  readonly line: number;
  readonly col: number;
  readonly savedAt: number;
  readonly variant: string;
}

const NO_CLASSES: ElementClasses = {
  element: null,
  tailwind: null,
  variants: null,
};

const NO_POSITION = -1;

const useClassesRequest = (target: ClassesTarget): ClassesRequest | null => {
  const { projectId, directionId, source, savedAt, variant } = target;
  let file = "";
  let line = NO_POSITION;
  let col = NO_POSITION;

  if (source) {
    ({ file, line, col } = source);
  }

  const isLocated = source !== null;

  return useMemo(() => {
    if (!isLocated || !directionId) {
      return null;
    }

    return { col, directionId, file, line, projectId, savedAt, variant };
  }, [isLocated, projectId, directionId, file, line, col, savedAt, variant]);
};

const useElementClasses = (target: ClassesTarget): ElementClasses => {
  const [info, setInfo] = useState<ElementClasses>(NO_CLASSES);
  const request = useClassesRequest(target);

  useEffect(() => {
    if (request === null) {
      return;
    }

    let live = true;
    startTransition(async () => {
      try {
        const result = await api.elementClasses(
          request.projectId,
          request.directionId,
          { col: request.col, file: request.file, line: request.line },
          request.variant
        );

        if (live) {
          setInfo({
            element: result.element ?? null,
            tailwind: result.tailwind,
            variants: result.variants ?? null,
          });
        }
      } catch {
        if (live) {
          setInfo(NO_CLASSES);
        }
      }
    });

    return (): void => {
      live = false;
    };
  }, [request]);

  if (request === null) {
    return NO_CLASSES;
  }

  return info;
};

export { useElementClasses };
