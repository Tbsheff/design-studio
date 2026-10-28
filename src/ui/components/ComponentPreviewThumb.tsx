import { useEffect, useRef, useState } from 'react';
import { STUDIO_TOKEN_HEADER } from '../../shared/contracts';
import { componentPreviewPath } from '../../shared/component-preview';
import { getSession } from '../session';
import { Icon } from './Icon';

type Shown = { state: 'idle' | 'loading' } | { state: 'ready'; src: string } | { state: 'none'; reason: string };

async function fetchPreview(projectId: string, directionId: string, id: string, signal: AbortSignal): Promise<Shown> {
  const res = await fetch(componentPreviewPath(projectId, directionId, id), { headers: { [STUDIO_TOKEN_HEADER]: getSession().token }, signal });
  if (res.ok) return { state: 'ready', src: URL.createObjectURL(await res.blob()) };
  const body = (await res.json().catch(() => null)) as { message?: unknown } | null;
  return { state: 'none', reason: typeof body?.message === 'string' ? body.message : 'No preview for this component.' };
}

function useVisible(ref: React.RefObject<HTMLElement | null>, active: boolean): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || !active || visible) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
    }, { rootMargin: '160px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, active, visible]);
  return visible;
}

export function ComponentPreviewThumb({ projectId, directionId, id, version, active, className = '' }: { projectId: string; directionId: string; id: string; version: string; active: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useVisible(ref, active);
  const [shown, setShown] = useState<Shown>({ state: 'idle' });
  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    setShown((prev) => (prev.state === 'ready' ? prev : { state: 'loading' }));
    fetchPreview(projectId, directionId, id, controller.signal).then(
      (next) => {
        if (controller.signal.aborted) {
          if (next.state === 'ready') URL.revokeObjectURL(next.src);
          return;
        }
        setShown((prev) => (next.state === 'none' && prev.state === 'ready' ? prev : next));
      },
      () => !controller.signal.aborted && setShown({ state: 'none', reason: 'The preview did not load.' }),
    );
    return () => controller.abort();
  }, [projectId, directionId, id, version, visible]);
  const src = shown.state === 'ready' ? shown.src : null;
  useEffect(() => () => {
    if (src) URL.revokeObjectURL(src);
  }, [src]);
  return (
    <span ref={ref} className={`cmp-thumb cmp-preview ${shown.state === 'idle' ? 'loading' : shown.state} ${className}`} aria-hidden="true" data-testid="component-preview" data-state={shown.state} {...(shown.state === 'none' ? { 'data-tip': shown.reason } : {})}>
      {src ? <img src={src} alt="" draggable={false} /> : shown.state === 'none' ? <Icon name="component" size={20} /> : null}
    </span>
  );
}
