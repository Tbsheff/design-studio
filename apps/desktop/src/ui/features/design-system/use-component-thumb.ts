import type { ComponentInfo } from "@design-studio/contracts";
import { useEffect, useState } from "react";

import { trimmedOrSelf } from "./thumb-trim.js";
import { componentThumb } from "./use-components.js";

type ThumbState = "loading" | "ready" | "none";

interface ThumbSource {
  active: boolean;
  component: ComponentInfo;
  directionId: string;
  projectId: string;
  version: string;
}

interface ComponentThumbView {
  blob: Blob | null;
  state: ThumbState;
}

const keepThumb = (prev: ComponentThumbView): ComponentThumbView => {
  if (prev.blob) {
    return prev;
  }

  return { blob: null, state: "none" };
};

const useComponentThumb = ({
  active,
  component,
  directionId,
  projectId,
  version,
}: ThumbSource): ComponentThumbView => {
  const [view, setView] = useState<ComponentThumbView>({
    blob: null,
    state: "loading",
  });

  const hasSelector = Boolean(component.selector);

  useEffect(() => {
    if (!hasSelector || !active) {
      return;
    }

    let live = true;

    const read = async (): Promise<void> => {
      let next: Blob | null = null;

      try {
        const fetched = await componentThumb(
          projectId,
          directionId,
          component.id,
          version
        );

        if (fetched) {
          next = await trimmedOrSelf(fetched);
        }
      } catch {
        next = null;
      }

      if (!live) {
        return;
      }

      if (next) {
        setView({ blob: next, state: "ready" });
      } else {
        setView((prev) => keepThumb(prev));
      }
    };

    read();

    return (): void => {
      live = false;
    };
  }, [projectId, directionId, component.id, hasSelector, version, active]);

  if (!hasSelector) {
    return { blob: null, state: "none" };
  }

  return view;
};

export { useComponentThumb };
