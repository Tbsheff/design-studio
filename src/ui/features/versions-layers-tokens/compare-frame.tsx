import { useEffect, useMemo, useRef, useState } from "react";

import type { ProjectKind, Version } from "../../../shared/contracts.js";
import { api, errorText } from "../../api.js";
import {
  HTML_FRAME_SANDBOX,
  frameSrc,
  tagFrame,
} from "../../platform/bridge.js";
import { randomToken } from "../../platform/session.js";
import { useTokenFrames } from "../design-system/token-frames.js";

interface Props {
  projectId: string;
  version: Version;
  title: string;
  kind: ProjectKind;
  viewport: { width: number; height: number };
  scale: number;
  onError: (message: string) => void;
}

export function CompareFrame({
  projectId,
  version,
  title,
  kind,
  viewport,
  scale,
  onError,
}: Props) {
  const [slot, setSlot] = useState<{ token: string; src: string } | null>(null);
  const elements = useRef<Record<string, HTMLIFrameElement | null>>({});
  const slots = useMemo(() => (slot ? [slot] : []), [slot]);
  const report = useRef(onError);
  report.current = onError;
  useTokenFrames(slots, elements, kind);
  useEffect(() => {
    let alive = true;
    const token = randomToken();
    const load = async () => {
      try {
        const { url } = await api.versionPreview(projectId, version.id);

        if (alive) {
          setSlot({ token, src: frameSrc(url) });
        }
      } catch (err) {
        if (alive) {
          report.current(
            `Could not load this version. ${errorText(err)} Close compare and try again.`
          );
        }
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [projectId, version.id]);

  if (!slot) {
    return null;
  }

  return (
    <iframe
      ref={(el) => {
        elements.current[slot.token] = tagFrame(el, slot.token);
      }}
      title={`Version ${title}`}
      src={slot.src}
      sandbox={kind === "html" ? HTML_FRAME_SANDBOX : undefined}
      width={viewport.width}
      height={viewport.height}
      style={{ transform: `scale(${scale})` }}
    />
  );
}
