import type { ComponentInfo } from "@design-studio/contracts";
import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import { componentThumb, trimmedUrl } from "./use-components.js";

type ThumbState = "loading" | "ready" | "none";

interface ThumbSource {
  active: boolean;
  component: ComponentInfo;
  directionId: string;
  projectId: string;
  version: string;
}

interface ComponentThumbView {
  src: string | null;
  state: ThumbState;
}

const useRevokeOnUnmount = (shown: MutableRefObject<string | null>): void => {
  useEffect(
    () => (): void => {
      if (shown.current) {
        URL.revokeObjectURL(shown.current);
      }
    },
    [shown]
  );
};

const useComponentThumb = ({
  active,
  component,
  directionId,
  projectId,
  version,
}: ThumbSource): ComponentThumbView => {
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<ThumbState>("loading");
  const shown = useRef<string | null>(null);
  const hasSelector = Boolean(component.selector);

  useRevokeOnUnmount(shown);

  useEffect(() => {
    if (!hasSelector || !active) {
      return;
    }

    let live = true;

    const read = async (): Promise<void> => {
      let next: string | null = null;

      try {
        next = await trimmedUrl(
          await componentThumb(projectId, directionId, component.id, version)
        );
      } catch {
        if (live && !shown.current) {
          setState("none");
        }

        return;
      }

      if (!live) {
        if (next) {
          URL.revokeObjectURL(next);
        }

        return;
      }

      if (!next) {
        if (!shown.current) {
          setState("none");
        }

        return;
      }

      if (shown.current) {
        URL.revokeObjectURL(shown.current);
      }

      shown.current = next;
      setSrc(next);
      setState("ready");
    };

    read();

    return (): void => {
      live = false;
    };
  }, [projectId, directionId, component.id, hasSelector, version, active]);

  if (!hasSelector) {
    return { src: null, state: "none" };
  }

  return { src, state };
};

export { useComponentThumb };
