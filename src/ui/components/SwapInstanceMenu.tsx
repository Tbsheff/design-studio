import { useCallback, useEffect, useRef, useState } from 'react';
import type { SwapCandidate, SwapCandidateList } from '../../shared/component-create';
import type { SourceLoc } from '../../shared/contracts';
import { apiMessage, componentCreateApi } from '../componentCreateApi';
import { usePopover } from '../usePopover';
import '../styles/create-component.css';

interface Props {
  projectId: string;
  directionId: string;
  use: SourceLoc;
  onDone: (result: { ok: boolean; text: string }) => void;
  onClose: () => void;
}

function hintOf(item: SwapCandidate): string {
  if (item.drop.length > 0) return `drops ${item.drop.join(', ')}`;
  if (item.add.length > 0) return `adds ${item.add.join(', ')}`;
  return 'all props fit';
}

export default function SwapInstanceMenu({ projectId, directionId, use, onDone, onClose }: Props) {
  const [list, setList] = useState<SwapCandidateList | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  usePopover(true, root, close);
  useEffect(() => {
    let live = true;
    componentCreateApi
      .swapCandidates(projectId, directionId, use)
      .then((result) => live && setList(result))
      .catch((error: unknown) => live && setList({ from: '', candidates: [], note: apiMessage(error) }));
    return () => {
      live = false;
    };
  }, [projectId, directionId, use]);
  const pick = (item: SwapCandidate) => {
    setBusy(item.name);
    componentCreateApi
      .swap(projectId, directionId, use, { name: item.name, file: item.file })
      .then((result) => onDone({ ok: true, text: `${result.title}${result.dropped.length > 0 ? `, dropped ${result.dropped.join(', ')}` : ''}` }))
      .catch((error: unknown) => onDone({ ok: false, text: apiMessage(error) }))
      .finally(onClose);
  };
  return (
    <div ref={root} className="ui-menu prp-swap-menu" role="menu" aria-label="Swap instance">
      <div className="ui-menu-section">
        <div className="ui-menu-label">{list?.from ? `Swap ${list.from} for` : 'Swap for'}</div>
        {list === null && <p className="prp-swap-empty">Finding components that fit…</p>}
        {list?.candidates.map((item) => (
          <button key={`${item.file}#${item.name}`} type="button" role="menuitem" className="ui-menu-item" disabled={busy !== null} data-tip={item.file} onClick={() => pick(item)}>
            <span>{item.name}</span>
            <span className="prp-swap-hint">{busy === item.name ? 'Swapping…' : hintOf(item)}</span>
          </button>
        ))}
        {list?.note && <p className="prp-swap-empty">{list.note}</p>}
      </div>
    </div>
  );
}
