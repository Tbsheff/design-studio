import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ProjectKind, Version } from '../../shared/contracts';
import { api, errorText } from '../api';
import { HTML_FRAME_SANDBOX, frameSrc } from '../bridge';
import { randomToken } from '../session';
import { useUi } from '../storage';
import { useTokenFrames } from '../tokenFrames';
import { Icon } from './Icon';

interface PaneProps {
  projectId: string;
  version: Version;
  kind: ProjectKind;
  scale: number;
  side: 'A' | 'B';
}

function ComparePane({ projectId, version, kind, scale, side }: PaneProps) {
  const { viewport } = useUi();
  const [slot, setSlot] = useState<{ token: string; src: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const elements = useRef<Record<string, HTMLIFrameElement | null>>({});
  const slots = useMemo(() => (slot ? [slot] : []), [slot]);
  useTokenFrames(slots, elements, kind);
  useEffect(() => {
    let alive = true;
    const token = randomToken();
    api
      .versionPreview(projectId, version.id)
      .then(({ url }) => alive && setSlot({ token, src: frameSrc(url, token) }))
      .catch((err) => alive && setError(`Could not load this version. ${errorText(err)} Close compare and try again.`));
    return () => {
      alive = false;
    };
  }, [projectId, version.id]);
  return (
    <div className="compare-pane">
      <div className="compare-label">
        <span className="badge accent">{side}</span>
        <span className="compare-title truncate" title={version.title}>
          {version.title}
        </span>
      </div>
      <div className="compare-stage">
        {error && <div className="stage-message">{error}</div>}
        <div className="compare-board" style={{ width: viewport.width * scale, height: viewport.height * scale }}>
          {slot && (
            <iframe
              ref={(el) => {
                elements.current[slot.token] = el;
              }}
              title={`Version ${version.title}`}
              src={slot.src}
              sandbox={kind === 'html' ? HTML_FRAME_SANDBOX : undefined}
              width={viewport.width}
              height={viewport.height}
              style={{ transform: `scale(${scale})` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  projectId: string;
  kind: ProjectKind;
  left: Version;
  right: Version;
  onClose: () => void;
}

export function CompareView({ projectId, kind, left, right, onClose }: Props) {
  const { viewport } = useUi();
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const paneW = (el.clientWidth - 48) / 2;
      const paneH = el.clientHeight - 76;
      setScale(Math.max(0.1, Math.min(1, paneW / viewport.width, paneH / viewport.height)));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [viewport.width, viewport.height]);
  return (
    <div className="canvas">
      <div className="toolbar">
        <Icon name="compare" />
        <strong className="toolbar-title">Compare</strong>
        <span className="dims-readout">
          {viewport.width} × {viewport.height}
        </span>
        <div className="spacer" />
        <button className="btn small has-icon" onClick={onClose}>
          <Icon name="close" size={14} />
          Close compare
        </button>
      </div>
      <div className="compare" ref={ref}>
        <ComparePane projectId={projectId} version={left} kind={kind} scale={scale} side="A" />
        <ComparePane projectId={projectId} version={right} kind={kind} scale={scale} side="B" />
      </div>
    </div>
  );
}
