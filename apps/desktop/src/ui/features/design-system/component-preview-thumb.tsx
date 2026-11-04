import { useEffect, useRef, useState } from "react";

import { componentPreviewPath } from "../../../shared/component-preview.js";
import { Icon } from "@design-studio/ui";
import { getRaw, readBlob } from "../../platform/http.js";

type Shown =
  | { state: "idle" | "loading" }
  | { state: "ready"; src: string }
  | { state: "none"; reason: string };

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const TRIM_PAD = 8;
const TRIM_DIFF = 24;

const differs = (data: Uint8ClampedArray, at: number): boolean =>
  Math.abs(data[at]! - data[0]!) +
    Math.abs(data[at + 1]! - data[1]!) +
    Math.abs(data[at + 2]! - data[2]!) +
    Math.abs(data[at + 3]! - data[3]!) >
  TRIM_DIFF;

const contentBox = (
  data: Uint8ClampedArray,
  width: number,
  height: number
): Box | null => {
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!differs(data, (y * width + x) * 4)) {
        continue;
      }

      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < 0) {
    return null;
  }

  const x = Math.max(0, left - TRIM_PAD);
  const y = Math.max(0, top - TRIM_PAD);

  return {
    h: Math.min(height, bottom + TRIM_PAD + 1) - y,
    w: Math.min(width, right + TRIM_PAD + 1) - x,
    x,
    y,
  };
};

const trimmed = async (blob: Blob): Promise<Blob> => {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    return blob;
  }

  ctx.drawImage(bitmap, 0, 0);

  const box = contentBox(
    ctx.getImageData(0, 0, bitmap.width, bitmap.height).data,
    bitmap.width,
    bitmap.height
  );

  if (!box || (box.w >= bitmap.width * 0.9 && box.h >= bitmap.height * 0.9)) {
    return blob;
  }

  const out = document.createElement("canvas");
  out.width = box.w;
  out.height = box.h;
  out
    .getContext("2d")
    ?.drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);

  return new Promise((resolve) => out.toBlob((next) => resolve(next ?? blob)));
};

export const trimmedUrl = async (
  url: string | null
): Promise<string | null> => {
  if (!url) {
    return url;
  }

  const blob = await readBlob(url);
  const next = await trimmed(blob).catch(() => blob);

  if (next === blob) {
    return url;
  }

  URL.revokeObjectURL(url);

  return URL.createObjectURL(next);
};

const fetchPreview = async (
  projectId: string,
  directionId: string,
  id: string,
  signal: AbortSignal
): Promise<Shown> => {
  const res = await getRaw(
    componentPreviewPath(projectId, directionId, id),
    signal
  );

  if (res.ok) {
    const blob = await res.blob();

    return {
      src: URL.createObjectURL(await trimmed(blob).catch(() => blob)),
      state: "ready",
    };
  }

  const body = (await res.json().catch(() => null)) as {
    message?: unknown;
  } | null;

  return {
    reason:
      typeof body?.message === "string"
        ? body.message
        : "No preview for this component.",
    state: "none",
  };
};

const useVisible = (
  ref: React.RefObject<HTMLElement | null>,
  active: boolean
): boolean => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;

    if (!node || !active || visible) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
        }
      },
      { rootMargin: "160px 0px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [ref, active, visible]);

  return visible;
};

interface PreviewLoad {
  readonly controller: AbortController;
  readonly directionId: string;
  readonly id: string;
  readonly projectId: string;
  readonly setShown: (update: (prev: Shown) => Shown) => void;
}

const keepReady = (prev: Shown, next: Shown): Shown =>
  next.state === "none" && prev.state === "ready" ? prev : next;

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

export const ComponentPreviewThumb = ({
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
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useVisible(ref, active);
  const [shown, setShown] = useState<Shown>({ state: "idle" });
  useEffect(() => {
    if (!visible) {
      return;
    }

    const controller = new AbortController();
    setShown((prev) => (prev.state === "ready" ? prev : { state: "loading" }));
    void showPreview({ controller, directionId, id, projectId, setShown });

    return () => controller.abort();
  }, [projectId, directionId, id, version, visible]);
  const src = shown.state === "ready" ? shown.src : null;
  useEffect(
    () => () => {
      if (src) {
        URL.revokeObjectURL(src);
      }
    },
    [src]
  );

  return (
    <span
      ref={ref}
      className={`cmp-thumb cmp-preview ${shown.state === "idle" ? "loading" : shown.state} ${className}`}
      aria-hidden="true"
      data-testid="component-preview"
      data-state={shown.state}
      {...(shown.state === "none" ? { "data-tip": shown.reason } : {})}
    >
      {src ? (
        <img src={src} alt="" draggable={false} />
      ) : shown.state === "none" ? (
        <Icon name="component" size={20} />
      ) : null}
    </span>
  );
};
