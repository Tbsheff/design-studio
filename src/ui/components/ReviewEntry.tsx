import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { ReviewFinding, ReviewResult, ReviewSeverity } from '../../shared/review';
import type { ParentMessageBody } from '../bridge';
import { frameName, type CanvasFrame } from '../canvasFrames';
import { useReview } from '../useReview';
import type { FilesChange } from '../useStudioData';
import { Icon } from './Icon';
import '../styles/review.css';

const ReviewPanel = lazy(() => import('./ReviewPanel'));

interface Props {
  projectId: string;
  directionId: string | null;
  frame: CanvasFrame;
  live: boolean;
  running?: boolean;
  lastChange: FilesChange | null;
  post: (body: ParentMessageBody) => void;
  shell?: { onAskAgent?: (text: string) => void };
  toolKey: string;
}

function labelOf(frame: CanvasFrame): string {
  return [frame.label ?? frameName(frame), frame.path].filter(Boolean).join(' · ');
}

function useSlot(marker: RefObject<HTMLSpanElement | null>): HTMLElement | null {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const found = marker.current?.closest('.canvas')?.querySelector<HTMLElement>('[data-topbar-slot="review"]') ?? null;
    if (found !== slot) setSlot(found);
  });
  return slot;
}

function badgeText(count: number): string {
  return count > 99 ? '99+' : String(count);
}

function entryTip(open: boolean, count: number | null, stale: boolean): string | undefined {
  if (open) return undefined;
  if (count === null) return 'Check contrast, tap targets, alt text, tokens and clipping';
  return `${count} review ${count === 1 ? 'finding' : 'findings'}${stale ? ' (from an older render)' : ''}`;
}

function worst(result: ReviewResult | null): ReviewSeverity | null {
  if (!result) return null;
  return (['high', 'medium', 'low'] as const).find((sev) => result.counts[sev] > 0) ?? null;
}

function useCloseOnToolChange(toolKey: string, close: () => void) {
  const last = useRef(toolKey);
  useEffect(() => {
    if (last.current === toolKey) return;
    last.current = toolKey;
    close();
  }, [toolKey, close]);
}

export function ReviewEntry(p: Props) {
  const marker = useRef<HTMLSpanElement>(null);
  const slot = useSlot(marker);
  const [open, setOpen] = useState(false);
  const close = useRef(() => setOpen(false)).current;
  useCloseOnToolChange(p.toolKey, close);
  const review = useReview({ projectId: p.projectId, directionId: p.directionId, frame: p.frame, lastChange: p.lastChange, open: open && p.live });
  const count = review.result ? review.result.findings.length : null;
  const ask = p.shell?.onAskAgent;
  const select = (finding: ReviewFinding) => {
    if (finding.selector) p.post({ type: 'select-selector', selector: finding.selector });
  };
  const sev = worst(review.result);
  const button = (
    <button
      type="button"
      className="btn ghost topbar-review review-entry"
      aria-label={count === null ? 'Review' : `Review, ${count} findings`}
      aria-pressed={open}
      aria-expanded={open}
      disabled={!p.directionId}
      data-tip={entryTip(open, count, review.stale)}
      data-tip-align="end"
      onClick={() => setOpen((v) => !v)}
    >
      {review.busy && !open ? <span className="spinner" /> : <Icon name="check" size={14} />}
      <span>Review</span>
      {count !== null && count > 0 && <span className={`review-badge ${review.stale ? 'stale' : (sev ?? 'low')}`}>{badgeText(count)}</span>}
    </button>
  );
  return (
    <>
      <span ref={marker} hidden />
      {slot && createPortal(button, slot)}
      {open && (
        <Suspense fallback={null}>
          <ReviewPanel review={review} frameLabel={labelOf(p.frame)} live={p.live} running={p.running === true} canAsk={Boolean(ask)} onSelect={select} onAsk={(finding) => ask?.(finding.ask)} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
