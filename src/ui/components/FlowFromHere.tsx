import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { FlowResult } from '../../shared/route-flow';
import { api, errorText } from '../api';
import { useCurrentFrameStates } from '../frameStates';
import { Icon } from './Icon';
import '../styles/route-flow.css';

const stop = (e: ReactPointerEvent) => e.stopPropagation();

function doneText(result: FlowResult): string {
  const added = result.frames.filter((frame) => frame.added).length;
  if (added === 0 && result.links.length === 0) return 'No new routes or links found in the source of this route.';
  const missing = result.missingParams.length > 0 ? ` Set ${result.missingParams.join(', ')} in App > Flow.` : '';
  return `Added ${added} ${added === 1 ? 'route' : 'routes'} and ${result.links.length} ${result.links.length === 1 ? 'link' : 'links'}.${missing}`;
}

export function FlowFromHere({ frameId, frameName }: { frameId: string; frameName: string }) {
  const states = useCurrentFrameStates();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!states) return null;
  const run = () => {
    setBusy(true);
    setNote(null);
    api
      .buildFlow(states.projectId, { from: frameId, depth: 1 })
      .then((result) => setNote(doneText(result)))
      .catch((err: unknown) => setNote(errorText(err)))
      .finally(() => setBusy(false));
  };
  return (
    <button
      type="button"
      className={`frame-chip flow${busy ? ' busy' : ''}${note ? ' done' : ''}`}
      aria-label={`Flow from ${frameName}`}
      aria-busy={busy}
      disabled={busy}
      onPointerDown={stop}
      onClick={run}
      onBlur={() => setNote(null)}
      data-tip={note ?? 'Flow from here: add the routes this page links to, with prototype links'}
    >
      {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="branch" size={12} />}
      {note && <span className="sr-only" role="status">{note}</span>}
    </button>
  );
}
