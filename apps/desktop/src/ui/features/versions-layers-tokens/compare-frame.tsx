import type { ProjectKind, Version } from "@design-studio/contracts";
import { useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";

import { HTML_FRAME_SANDBOX, tagFrame } from "../../platform/bridge.js";
import { useTokenFrames } from "../design-system/token-frames.js";
import { useVersionSlot } from "./use-version-slot.js";

const SANDBOX_BY_KIND: Partial<Record<ProjectKind, string>> = {
  html: HTML_FRAME_SANDBOX,
};

interface Props {
  projectId: string;
  version: Version;
  title: string;
  kind: ProjectKind;
  viewport: { width: number; height: number };
  scale: number;
  onError: (message: string) => void;
}

const CompareFrame = ({
  projectId,
  version,
  title,
  kind,
  viewport,
  scale,
  onError,
}: Props): ReactNode => {
  const slot = useVersionSlot(projectId, version.id, onError);
  const elements = useRef<Record<string, HTMLIFrameElement | null>>({});

  const slots = useMemo(() => {
    if (slot) {
      return [slot];
    }

    return [];
  }, [slot]);

  useTokenFrames(slots, elements, kind);

  const token = slot?.token ?? "";

  const handleRef = useCallback(
    (frame: HTMLIFrameElement | null): void => {
      elements.current[token] = tagFrame(frame, token);
    },
    [token]
  );

  const frameStyle = useMemo(() => ({ transform: `scale(${scale})` }), [scale]);

  if (!slot) {
    return null;
  }

  return (
    <iframe
      ref={handleRef}
      title={`Version ${title}`}
      src={slot.src}
      sandbox={SANDBOX_BY_KIND[kind]}
      width={viewport.width}
      height={viewport.height}
      style={frameStyle}
    />
  );
};

export { CompareFrame };
