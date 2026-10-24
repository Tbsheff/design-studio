import { useEffect, useRef, useState, type RefObject } from 'react';
import { cachedThumb, requestThumb, type ThumbResult } from '../versionsApi';
import { Icon } from './Icon';

interface Props {
  projectId: string;
  versionId: string;
  active: boolean;
  label: string;
  onOpen: () => void;
}

function useInView(ref: RefObject<HTMLElement | null>, enabled: boolean): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) {
      setSeen(false);
      return;
    }
    const io = new IntersectionObserver((entries) => setSeen(entries.some((entry) => entry.isIntersecting)), { rootMargin: '64px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enabled]);
  return seen;
}

export function VersionThumb({ projectId, versionId, active, label, onOpen }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [result, setResult] = useState<ThumbResult | undefined>(() => cachedThumb(projectId, versionId));
  const [loaded, setLoaded] = useState(false);
  const inView = useInView(ref, active && result === undefined);
  useEffect(() => {
    if (!inView || result !== undefined) return;
    return requestThumb(projectId, versionId, setResult);
  }, [inView, result, projectId, versionId]);
  const state = result === undefined ? 'loading' : result === null ? 'none' : loaded ? 'ready' : 'loading';
  return (
    <button ref={ref} type="button" className={`version-thumb ${state}`} data-testid="version-thumb" data-state={state} tabIndex={-1} aria-label={`Open ${label}`} onClick={onOpen}>
      {result ? <img src={result} alt="" draggable={false} onLoad={() => setLoaded(true)} /> : result === null ? <Icon name="file" size={14} /> : null}
    </button>
  );
}
