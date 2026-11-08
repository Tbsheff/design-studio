import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

import { BlobImage } from "./blob-image.js";
import { keepReady, loadPreviewBlob } from "./thumb-preview.js";
import type { PreviewBlob, PreviewLoad, Shown } from "./thumb-preview.js";
import { useThumbVisible } from "./use-thumb-visible.js";

const ICON_SIZE = 20;

const toLoadingShown = (prev: Shown): Shown => {
  if (prev.state === "ready") {
    return prev;
  }

  return { state: "loading" };
};

const toLoadedShown = (loaded: PreviewBlob): Shown => {
  if (loaded.kind !== "blob") {
    return { reason: loaded.reason, state: "none" };
  }

  return { blob: loaded.blob, state: "ready" };
};

const showPreview = async (load: PreviewLoad): Promise<void> => {
  const { controller } = load;
  load.setShown((prev) => toLoadingShown(prev));

  try {
    const loaded = await loadPreviewBlob(load);

    if (!controller.signal.aborted) {
      const next = toLoadedShown(loaded);
      load.setShown((prev) => keepReady(prev, next));
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

const toBlob = (shown: Shown): Blob | null => {
  if (shown.state === "ready") {
    return shown.blob;
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

    showPreview({
      controller,
      directionId,
      id,
      projectId,
      setShown,
      version,
    });

    return (): void => controller.abort();
  }, [projectId, directionId, id, version, visible]);

  const blob = toBlob(shown);

  return (
    <span
      ref={ref}
      className={`cmp-thumb cmp-preview ${toStateClass(shown)} ${className}`}
      aria-hidden="true"
      data-testid="component-preview"
      data-state={shown.state}
      data-tip={toTip(shown)}
    >
      {blob && <BlobImage blob={blob} />}
      {!blob && shown.state === "none" && (
        <Icon name="component" size={ICON_SIZE} />
      )}
    </span>
  );
};

export { ComponentPreviewThumb };
