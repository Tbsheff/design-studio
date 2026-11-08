import { startTransition, useEffect, useMemo, useState } from "react";

import { api } from "../../api.js";
import { NO_CLASSES, toClassRequest } from "./element-classes-model.js";
import type {
  ClassesOptions,
  ElementClasses,
} from "./element-classes-model.js";

const useElementClasses = (options: ClassesOptions): ElementClasses => {
  const [info, setInfo] = useState<ElementClasses>(NO_CLASSES);
  const { projectId, directionId, savedAt, variant } = options;
  const file = options.source?.file ?? null;
  const line = options.source?.line ?? null;
  const col = options.source?.col ?? null;

  const request = useMemo(
    () =>
      toClassRequest(
        { directionId, projectId, savedAt, variant },
        file,
        line,
        col
      ),
    [projectId, directionId, savedAt, variant, file, line, col]
  );

  useEffect(() => {
    if (!request) {
      return;
    }

    let isLive = true;

    startTransition(async () => {
      try {
        const result = await api.elementClasses(
          request.projectId,
          request.directionId,
          request.loc,
          request.variant
        );

        if (isLive) {
          setInfo({
            element: result.element ?? null,
            tailwind: result.tailwind,
            variants: result.variants ?? null,
          });
        }
      } catch {
        if (isLive) {
          setInfo(NO_CLASSES);
        }
      }
    });

    return (): void => {
      isLive = false;
    };
  }, [request]);

  if (!request) {
    return NO_CLASSES;
  }

  return info;
};

export { useElementClasses };
