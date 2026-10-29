import { memo, useSyncExternalStore, type MutableRefObject } from 'react';
import type { BridgeToParent, CreateTokenResult, MatchKind, SelectionContext } from '../../shared/contracts';
import type { PreviewPort } from '../bridge';
import { cssVarFor } from '../../shared/token-match';
import { api } from '../api';
import type { StyleValues } from '../cssValues';
import type { DesignTokens } from '../useDesignSystemState';
import type { DirectEdit } from '../useDirectEdit';
import type { CreateRequest } from '../useTokenSnap';
import { CreateTokenDialog, type CreateTokenSubmit } from './CreateTokenDialog';
import { Icon } from './Icon';
import { InspectorSection } from './InspectorFields';
import { NumberField } from './NumberField';

export function MultiNote({ reason }: { reason: string | null }) {
  if (!reason) return null;
  return (
    <div className="ins-multi-note" role="note">
      <Icon name="alert" size={14} />
      <span>{reason}</span>
    </div>
  );
}

export function MultiSizeSection({ edit }: { edit: DirectEdit }) {
  return (
    <InspectorSection title="Size">
      <div className="ins-grid">
        <NumberField short="W" spec={{ prop: 'width', label: 'Width', edit, min: 0 }} />
        <NumberField short="H" spec={{ prop: 'height', label: 'Height', edit, min: 0 }} />
      </div>
    </InspectorSection>
  );
}

interface HostProps {
  projectId: string;
  directionId: string | null;
  tokens: DesignTokens | null;
  edit: DirectEdit;
  request: CreateRequest | null;
  onClose: () => void;
}

export function MultiCreateTokenHost({ projectId, directionId, tokens, edit, request, onClose }: HostProps) {
  if (!tokens || !request) return null;
  const submit = async (input: CreateTokenSubmit): Promise<CreateTokenResult> => {
    if (!directionId) throw new Error('No direction selected');
    await edit.drain();
    const result = await api.createToken(projectId, directionId, {
      group: input.group,
      name: input.name,
      value: input.value,
      ...(input.darkValue ? { darkValue: input.darkValue } : {}),
    });
    tokens.replace(result.state);
    if (input.apply) {
      const cssVar = cssVarFor(input.group, input.name);
      const style: Partial<StyleValues> = Object.fromEntries(request.targets.map((p) => [p, `var(${cssVar})`]));
      edit.preview(style);
      edit.commit();
    }
    return result;
  };
  return <CreateTokenDialog request={request} entries={tokens.entries} onSubmit={submit} onClose={onClose} />;
}

const MATCH_OPTIONS: { by: MatchKind; label: string; tip: string }[] = [
  { by: 'component', label: 'Component', tip: 'Select every copy of this component or element' },
  { by: 'classes', label: 'Classes', tip: 'Select elements with exactly the same classes' },
  { by: 'text-style', label: 'Text style', tip: 'Select text with the same font, size, weight, line height and tracking' },
];
const MATCH_WAIT_MS = 5000;
const MATCH_NOTE_MS = 6000;

let matchNote: { text: string; at: number } | null = null;
let matchSeq = 0;
const matchSubs = new Set<() => void>();

function setMatchNote(text: string | null): void {
  matchNote = text ? { text, at: Date.now() } : null;
  for (const sub of matchSubs) sub();
}

function subscribeMatch(sub: () => void): () => void {
  matchSubs.add(sub);
  return () => matchSubs.delete(sub);
}

function matchedText(message: Extract<BridgeToParent, { type: 'matched' }>): string {
  if (message.note) return message.note;
  return message.count <= 1 ? 'No other element matches.' : `Selected ${message.count} matching elements.`;
}

function askMatching(port: PreviewPort, selector: string, by: MatchKind): void {
  matchSeq += 1;
  const requestId = `match-${matchSeq}`;
  setMatchNote(null);
  const stop = port.listen?.((message) => {
    if (message.type !== 'matched' || message.requestId !== requestId) return;
    done();
    setMatchNote(matchedText(message));
  });
  const timer = window.setTimeout(() => done(), MATCH_WAIT_MS);
  function done(): void {
    window.clearTimeout(timer);
    stop?.();
  }
  port.post({ type: 'select-matching', requestId, selector, by });
}

function SelectMatchingView({ selection, port }: { selection: SelectionContext[]; port: MutableRefObject<PreviewPort | null> }) {
  const note = useSyncExternalStore(subscribeMatch, () => matchNote);
  const base = selection.at(-1);
  if (!base) return null;
  const fresh = note && Date.now() - note.at < MATCH_NOTE_MS ? note.text : null;
  return (
    <InspectorSection title="Select matching">
      <div className="ins-add-links ins-select-matching" role="group" aria-label="Select matching">
        {MATCH_OPTIONS.map((option) => (
          <button key={option.by} type="button" className="ins-add-link" data-tip={option.tip} onClick={() => port.current && askMatching(port.current, base.selector, option.by)}>
            {option.label}
          </button>
        ))}
      </div>
      {fresh && (
        <p className="ins-select-matching-note" role="status">
          {fresh}
        </p>
      )}
    </InspectorSection>
  );
}

export const SelectMatchingSection = memo(SelectMatchingView, (a, b) => a.port === b.port && a.selection.length === b.selection.length && a.selection.every((item, i) => item === b.selection[i]));
