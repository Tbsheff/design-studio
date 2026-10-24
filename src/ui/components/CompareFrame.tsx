import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectKind, Version } from '../../shared/contracts';
import { api, errorText } from '../api';
import { HTML_FRAME_SANDBOX, frameSrc } from '../bridge';
import { randomToken } from '../session';
import { useTokenFrames } from '../tokenFrames';

interface Props {
  projectId: string;
  version: Version;
  title: string;
  kind: ProjectKind;
  viewport: { width: number; height: number };
  scale: number;
  onError: (message: string) => void;
}

export function CompareFrame({ projectId, version, title, kind, viewport, scale, onError }: Props) {
  const [slot, setSlot] = useState<{ token: string; src: string } | null>(null);
  const elements = useRef<Record<string, HTMLIFrameElement | null>>({});
  const slots = useMemo(() => (slot ? [slot] : []), [slot]);
  const report = useRef(onError);
  report.current = onError;
  useTokenFrames(slots, elements, kind);
  useEffect(() => {
    let alive = true;
    const token = randomToken();
    api
      .versionPreview(projectId, version.id)
      .then(({ url }) => alive && setSlot({ token, src: frameSrc(url, token) }))
      .catch((err) => alive && report.current(`Could not load this version. ${errorText(err)} Close compare and try again.`));
    return () => {
      alive = false;
    };
  }, [projectId, version.id]);
  if (!slot) return null;
  return (
    <iframe
      ref={(el) => {
        elements.current[slot.token] = el;
      }}
      title={`Version ${title}`}
      src={slot.src}
      sandbox={kind === 'html' ? HTML_FRAME_SANDBOX : undefined}
      width={viewport.width}
      height={viewport.height}
      style={{ transform: `scale(${scale})` }}
    />
  );
}
