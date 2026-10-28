import type { BridgeToParent, DirectEditRequest, DomPatch, TailwindOutcome } from '../shared/contracts';
import type { PreviewPort } from './bridge';

const RESULT_WAIT_MS = 30_000;

export interface OptimisticEdit {
  saved: (tailwind: TailwindOutcome | null | undefined) => void;
  failed: (reason: string) => void;
}

let counter = 0;

function nextId(): string {
  counter += 1;
  return `ui-${Date.now().toString(36)}-${counter}`;
}

export function domPatchFor(req: DirectEditRequest): DomPatch | null {
  if (req.variant || req.move !== undefined || req.insert !== undefined) return null;
  const style = req.style && Object.keys(req.style).length > 0 ? (req.style as Record<string, string | null>) : undefined;
  if (!style && req.text === undefined) return null;
  return { selector: req.selector, trusted: true, ...(style ? { style } : {}), ...(req.text !== undefined ? { text: req.text } : {}) };
}

function watchResult(port: PreviewPort, id: string, onProblem: (reason: string) => void): void {
  if (!port.listen) return;
  const stop = port.listen((message: BridgeToParent) => {
    if (message.type !== 'optimistic-result' || message.id !== id) return;
    stop();
    window.clearTimeout(timer);
    if (message.outcome === 'mismatch' || message.outcome === 'timeout') onProblem(message.reason ?? 'The page does not show the saved edit.');
  });
  const timer = window.setTimeout(stop, RESULT_WAIT_MS);
}

const NOOP: OptimisticEdit = { saved: () => undefined, failed: () => undefined };

export function startOptimistic(port: PreviewPort | null | undefined, req: DirectEditRequest, onProblem: (reason: string) => void): OptimisticEdit {
  const patch = domPatchFor(req);
  if (!port || !patch) return NOOP;
  const id = nextId();
  port.post({ type: 'optimistic-apply', id, patch, written: false });
  watchResult(port, id, onProblem);
  return {
    saved: (tailwind) => port.post({ type: 'optimistic-settle', id, ok: true, ...(tailwind?.mode === 'classes' && tailwind.delta ? { classes: tailwind.delta } : {}) }),
    failed: (reason) => port.post({ type: 'optimistic-settle', id, ok: false, reason }),
  };
}
