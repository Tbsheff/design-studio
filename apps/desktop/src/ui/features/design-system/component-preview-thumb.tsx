import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

import { keepReady, loadPreviewBlob } from "./thumb-preview.js";
import type { PreviewLoad, Shown } from "./thumb-preview.js";
import { useThumbVisible } from "./use-thumb-visible.js";

const ICON_SIZE = 20;

const fetchPreview = async (
  projectId: string,
  directionId: string,
  id: string,
  signal: AbortSignal
): Promise<Shown> => {
  const loaded = await loadPreviewBlob(projectId, directionId, id, signal);

  if (loaded.kind === "blob") {
    return { src: URL.createObjectURL(loaded.blob), state: "ready" };
  }

  return { reason: loaded.reason, state: "none" };
};

const showPreview = async (load: PreviewLoad): Promise<void> => {
  const { controller } = load;

  try {
    const next = await fetchPreview(
      load.projectId,
      load.directionId,
      load.id,
      controller.signal
    );

    if (!controller.signal.aborted) {
      load.setShown((prev) => keepReady(prev, next));

      return;
    }

    if (next.state === "ready") {
      URL.revokeObjectURL(next.src);
    }
  } catch {
    if (!controller.signal.aborted) {
      load.setShown(() => ({
        reason: "The preview did not load.",
        state: "none",
      }));
    }
  }
};

const toLoadingShown = (prev: Shown): Shown => {
  if (prev.state === "ready") {
    return prev;
  }

  return { state: "loading" };
};

const toStateClass = (shown: Shown): string => {
  if (shown.state === "idle") {
    return "loading";
  }

  return shown.state;
};

const toTip = (shown: Shown): string | null => {
  if (shown.state === "none") {
    return shown.reason;
  }

  return null;
};

const toSource = (shown: Shown): string | null => {
  if (shown.state === "ready") {
    return shown.src;
  }

  return null;
};

const ComponentPreviewThumb = ({
  projectId,
  directionId,
  id,
  version,
  active,
  className = "",
}: {
  projectId: string;
  directionId: string;
  id: string;
  version: string;
  active: boolean;
  className?: string;
}): ReactElement => {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useThumbVisible(ref, active);
  const [shown, setShown] = useState<Shown>({ state: "idle" });

  useEffect(() => {
    if (!visible) {
      return;
    }

    const controller = new AbortController();

    setShown((prev) => toLoadingShown(prev));
    showPreview({ controller, directionId, id, projectId, setShown });

    return (): void => controller.abort();
  }, [projectId, directionId, id, version, visible]);

  const src = toSource(shown);

  useEffect(
    () => (): void => {
      if (src) {
        URL.revokeObjectURL(src);
      }
    },
    [src]
  );

  return (
    <span
      ref={ref}
      className={`cmp-thumb cmp-preview ${toStateClass(shown)} ${className}`}
      aria-hidden="true"
      data-testid="component-preview"
      data-state={shown.state}
      data-tip={toTip(shown)}
    >
      {src && <img src={src} alt="" draggable={false} />}
      {!src && shown.state === "none" && (
        <Icon name="component" size={ICON_SIZE} />
      )}
    </span>
  );
};

export { ComponentPreviewThumb };
