import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MutableRefObject } from 'react';
import type { CompiledTokenEntry, SelectionContext } from '../../shared/contracts';
import { TOKEN_GROUP_FOR_PROPERTY } from '../../shared/contracts';
import {
  STYLE_KINDS,
  hitsForRow,
  isRawClass,
  kindOf,
  matchesOf,
  replaceSummary,
  summarizeHits,
  unlocatedCount,
  type StyleHit,
  type StyleKind,
  type StyleQuery,
  type StyleScanResult,
  type StyleValueRow,
  type TokenLookup,
} from '../../shared/style-search';
import { colorHex, matchForProperty, tokenFieldState, type TokenMode } from '../../shared/token-match';
import { errorText, replaceStyle } from '../api';
import type { PreviewPort } from '../bridge';
import { usePopover } from '../usePopover';
import type { DesignTokens } from '../useDesignSystemState';
import { Icon } from './Icon';
import { InspectorSection } from './InspectorFields';
import '../styles/inspector-match.css';

export interface InspectorMatchProps {
  projectId: string;
  directionId: string;
  selection: SelectionContext[];
  port: MutableRefObject<PreviewPort | null>;
  tokens: DesignTokens | null;
  drain: () => Promise<void>;
}

type Scope = 'selection' | 'page';
type Status = { kind: 'idle' } | { kind: 'busy'; text: string } | { kind: 'done'; text: string } | { kind: 'error'; text: string };

const REPLY_MS = 5000;
const ROWS_SHOWN = 6;
const PICK_SHOWN = 8;
const KIND_LABEL: Record<StyleKind, string> = { color: 'Colors', 'font-size': 'Font sizes', radius: 'Radii', spacing: 'Spacing' };

function requestStyles(port: PreviewPort | null, query: StyleQuery, select: boolean): Promise<{ result: StyleScanResult; selected: number } | null> {
  const listen = port?.listen;
  if (!port || !listen) return Promise.resolve(null);
  const requestId = Math.random().toString(36).slice(2);
  return new Promise((resolve) => {
    const stop = listen((message) => {
      if (message.type !== 'styles-found' || message.requestId !== requestId) return;
      finish({ result: message.result, selected: message.selected });
    });
    const timer = window.setTimeout(() => finish(null), REPLY_MS);
    function finish(value: { result: StyleScanResult; selected: number } | null) {
      window.clearTimeout(timer);
      stop();
      resolve(value);
    }
    port.post({ type: 'find-styles', requestId, query, select });
  });
}

function lookupFor(tokens: DesignTokens | null): TokenLookup | null {
  if (!tokens || tokens.entries.length === 0) return null;
  return (property, value) => {
    const state = tokenFieldState(property, value, tokens.entries, tokens.mode);
    return state.kind === 'token' ? state.match.cssVar : null;
  };
}

function useStyleScan(port: MutableRefObject<PreviewPort | null>, query: StyleQuery, key: string) {
  const [hits, setHits] = useState<StyleHit[] | null>(null);
  const [nonce, setNonce] = useState(0);
  const queryRef = useRef(query);
  queryRef.current = query;
  useEffect(() => {
    let live = true;
    void requestStyles(port.current, queryRef.current, false).then((reply) => {
      if (live) setHits(reply ? reply.result.hits : []);
    });
    return () => {
      live = false;
    };
  }, [port, key, nonce]);
  useEffect(() => {
    const listen = port.current?.listen;
    if (!listen) return;
    return listen((message) => {
      if (message.type === 'ready') setNonce((n) => n + 1);
    });
  }, [port]);
  return { hits, refresh: useCallback(() => setNonce((n) => n + 1), []) };
}

function shownValue(row: Pick<StyleValueRow, 'kind' | 'value'>): string {
  return row.kind === 'color' ? (colorHex(row.value) ?? row.value) : row.value;
}

function StateTag({ row }: { row: StyleValueRow }) {
  if (row.state === 'raw') return <span className="sm-tag raw" data-tip="Not a token. Replace it with one">raw</span>;
  if (row.state === 'palette') return <span className="sm-tag mixed" data-tip={`Tailwind palette class ${row.tokens.join(', ')}, not a project token`}>{row.tokens[0] ?? 'palette'}</span>;
  const token = row.tokens[0] ?? '';
  const more = row.tokens.length > 1 ? ` +${row.tokens.length - 1}` : '';
  return (
    <span className={`sm-tag ${row.state === 'mixed' ? 'mixed' : 'token'}`} data-tip={row.state === 'mixed' ? 'Some elements use a token, some a raw value' : `Token ${row.tokens.join(', ')}`}>
      {token}
      {more}
    </span>
  );
}

interface Candidate {
  token: string;
  value: string;
  hint: string;
}

function designCandidates(row: StyleValueRow, entries: CompiledTokenEntry[], mode: TokenMode): Candidate[] {
  const property = row.properties[0];
  if (!property || !TOKEN_GROUP_FOR_PROPERTY[property]) return [];
  return matchForProperty(property, row.value, entries, mode).map((match) => ({ token: match.cssVar, value: match.value, hint: match.path }));
}

function classCandidates(row: StyleValueRow, page: StyleHit[]): Candidate[] {
  const seen = new Map<string, Candidate>();
  for (const hit of page) {
    if (!hit.cls || isRawClass(hit.cls) || kindOf(hit.property) !== row.kind || seen.has(hit.cls)) continue;
    seen.set(hit.cls, { token: hit.cls, value: hit.value, hint: hit.value === row.value ? 'same value' : '' });
  }
  return [...seen.values()].sort((a, b) => Number(b.value === row.value) - Number(a.value === row.value) || a.token.localeCompare(b.token));
}

function Swatch({ kind, value }: { kind: StyleKind; value: string }) {
  if (kind !== 'color') return null;
  return <span className="sm-swatch" style={{ background: value }} aria-hidden="true" />;
}

function TokenPicker(props: { row: StyleValueRow; candidates: Candidate[]; target: string; onPick: (token: string) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.closest('.sm-picker')?.scrollIntoView({ block: 'nearest' });
  }, []);
  const filter = text.trim().toLowerCase();
  const shown = props.candidates.filter((c) => !filter || c.token.toLowerCase().includes(filter) || c.hint.toLowerCase().includes(filter)).slice(0, PICK_SHOWN);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      props.onClose();
    } else if (event.key === 'Enter' && text.trim()) {
      event.preventDefault();
      props.onPick(shown[0]?.token.toLowerCase() === filter ? (shown[0]?.token ?? text.trim()) : text.trim());
    }
  };
  return (
    <div className="sm-picker" role="group" aria-label={`Replace ${shownValue(props.row)} with a token`}>
      <p className="sm-picker-head">
        Replace <code>{shownValue(props.row)}</code> on {props.target}
      </p>
      <input ref={input} className="ins-input sm-picker-input" aria-label="Token or class" placeholder="--primary or bg-primary" value={text} spellCheck={false} autoComplete="off" onChange={(e) => setText(e.target.value)} onKeyDown={onKeyDown} />
      <div className="sm-picker-list" role="listbox" aria-label="Tokens">
        {shown.map((candidate) => (
          <button key={candidate.token} type="button" role="option" aria-selected="false" className="ui-menu-item sm-pick" onClick={() => props.onPick(candidate.token)}>
            <Swatch kind={props.row.kind} value={candidate.value} />
            <code className="sm-pick-token">{candidate.token}</code>
            <span className="ui-menu-meta">{candidate.hint || shownValue({ kind: props.row.kind, value: candidate.value })}</span>
          </button>
        ))}
        {shown.length === 0 && <p className="sm-empty">Type a CSS variable or a Tailwind class, then press Return.</p>}
      </div>
      <div className="sm-picker-actions">
        <button type="button" className="btn ghost small" onClick={props.onClose}>
          Cancel
        </button>
        <button type="button" className="btn small" disabled={!text.trim()} onClick={() => props.onPick(text.trim())}>
          Replace
        </button>
      </div>
    </div>
  );
}

interface RowActions {
  selectValue: (row: StyleValueRow) => void;
  selectClass: (row: StyleValueRow, cls: string) => void;
  replace: (row: StyleValueRow) => void;
}

function RowMenu({ row, actions, replaceLabel }: { row: StyleValueRow; actions: RowActions; replaceLabel: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);
  usePopover(open, root, close);
  useEffect(() => {
    if (open) root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [open]);
  const run = (task: () => void) => () => {
    close(false);
    task();
  };
  const raws = row.classes.filter(isRawClass).slice(0, 2);
  const named = row.classes.filter((cls) => !isRawClass(cls)).slice(0, 2);
  return (
    <div className="sm-menu-root" ref={root}>
      <button ref={trigger} type="button" className="icon-btn small" aria-haspopup="menu" aria-expanded={open} aria-label={`Actions for ${shownValue(row)}`} data-tip={open ? undefined : 'Select or replace'} data-tip-align="end" onClick={() => setOpen((v) => !v)}>
        <Icon name="more" size={14} />
      </button>
      {open && (
        <div className="ui-menu sm-menu" role="menu" aria-label={`${shownValue(row)} actions`}>
          <button type="button" role="menuitem" tabIndex={-1} className="ui-menu-item" onClick={run(() => actions.selectValue(row))}>
            <Icon name="pointer" size={14} />
            <span>Select all with this value</span>
          </button>
          {[...raws, ...named].map((cls) => (
            <button key={cls} type="button" role="menuitem" tabIndex={-1} className="ui-menu-item" onClick={run(() => actions.selectClass(row, cls))}>
              <Icon name="code" size={14} />
              <span className="sm-menu-class">
                Select all with <code>{cls}</code>
              </span>
            </button>
          ))}
          <button type="button" role="menuitem" tabIndex={-1} className="ui-menu-item" onClick={run(() => actions.replace(row))}>
            <Icon name="token" size={14} />
            <span>{replaceLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ValueRow({ row, actions, replaceLabel }: { row: StyleValueRow; actions: RowActions; replaceLabel: string }) {
  return (
    <li className="sm-row" data-testid="style-value">
      <Swatch kind={row.kind} value={row.value} />
      <span className="sm-value">{shownValue(row)}</span>
      <StateTag row={row} />
      <span className="sm-count" data-tip={`${row.count} ${row.count === 1 ? 'element' : 'elements'}`}>
        {row.count}
      </span>
      <RowMenu row={row} actions={actions} replaceLabel={replaceLabel} />
    </li>
  );
}

function KindGroup({ kind, rows, actions, replaceLabel }: { kind: StyleKind; rows: StyleValueRow[]; actions: RowActions; replaceLabel: string }) {
  const [all, setAll] = useState(false);
  if (rows.length === 0) return null;
  const shown = all ? rows : rows.slice(0, ROWS_SHOWN);
  return (
    <div className="sm-group">
      <h4 className="sm-group-head">{KIND_LABEL[kind]}</h4>
      <ul className="sm-list">
        {shown.map((row) => (
          <ValueRow key={`${row.kind}|${row.value}`} row={row} actions={actions} replaceLabel={replaceLabel} />
        ))}
      </ul>
      {rows.length > ROWS_SHOWN && (
        <button type="button" className="tk-lint-more" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show ${rows.length - ROWS_SHOWN} more`}
        </button>
      )}
    </div>
  );
}

function ScopeToggle({ scope, onScope }: { scope: Scope; onScope: (scope: Scope) => void }) {
  return (
    <div className="segmented sm-scope" role="radiogroup" aria-label="Values from">
      {(['selection', 'page'] as const).map((id) => (
        <button key={id} type="button" role="radio" aria-checked={scope === id} tabIndex={scope === id ? 0 : -1} className={scope === id ? 'on' : ''} onClick={() => onScope(id)}>
          {id === 'selection' ? 'Selection' : 'Page'}
        </button>
      ))}
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === 'idle') return null;
  return (
    <p className={`sm-status ${status.kind}`} role={status.kind === 'error' ? 'alert' : 'status'}>
      {status.kind === 'busy' && <span className="spinner" />}
      {status.text}
    </p>
  );
}

function useReplace(props: InspectorMatchProps, setStatus: (status: Status) => void, refresh: () => void) {
  return useCallback(
    async (hits: StyleHit[], token: string) => {
      const matches = matchesOf(hits);
      const unlocated = unlocatedCount(hits);
      if (matches.length === 0) return setStatus({ kind: 'error', text: 'These elements have no source location, so they cannot be changed here.' });
      setStatus({ kind: 'busy', text: `Replacing ${matches.length} values…` });
      try {
        await props.drain();
        const result = await replaceStyle(props.projectId, props.directionId, { matches, token });
        const extra = unlocated > 0 ? `. ${unlocated} without a source location left as they are` : '';
        setStatus({ kind: result.replaced > 0 ? 'done' : 'error', text: `${replaceSummary(result, token)}${extra}.` });
        refresh();
      } catch (error) {
        setStatus({ kind: 'error', text: errorText(error) });
      }
    },
    [props, setStatus, refresh],
  );
}

function selectedText(count: number, total: number): string {
  if (count === 0) return 'No element on this page has a source location for that value.';
  return total > count ? `Selected ${count} of ${total} elements (the first ${count}).` : `Selected ${count} ${count === 1 ? 'element' : 'elements'}.`;
}

function InspectorMatch(props: InspectorMatchProps) {
  const single = props.selection.length === 1;
  const [scope, setScope] = useState<Scope>('selection');
  const [picking, setPicking] = useState<StyleValueRow | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const selectors = props.selection.map((s) => s.selector);
  const query = useMemo<StyleQuery>(() => (scope === 'page' ? {} : { within: selectors }), [scope, selectors.join('\n')]);
  const scanned = useStyleScan(props.port, query, `${scope}|${selectors.join('\n')}`);
  const page = useStyleScan(props.port, {}, 'page');
  const lookup = useMemo(() => lookupFor(props.tokens), [props.tokens]);
  const rows = useMemo(() => summarizeHits(scanned.hits ?? [], lookup), [scanned.hits, lookup]);
  const refreshAll = useCallback(() => {
    scanned.refresh();
    page.refresh();
  }, [scanned.refresh, page.refresh]);
  const replace = useReplace(props, setStatus, refreshAll);
  const pageWide = scope === 'page' || single;
  const replaceLabel = pageWide ? 'Replace on page with token…' : 'Replace in selection with token…';
  const selectBy = useCallback(
    async (row: StyleValueRow, extra: StyleQuery) => {
      setStatus({ kind: 'busy', text: 'Finding matches…' });
      const reply = await requestStyles(props.port.current, { property: row.kind, ...extra }, true);
      setStatus(reply ? { kind: 'done', text: selectedText(reply.selected, reply.result.elements) } : { kind: 'error', text: 'The frame did not answer. Reload it and try again.' });
    },
    [props.port],
  );
  const actions: RowActions = {
    selectValue: (row) => void selectBy(row, { value: row.value }),
    selectClass: (row, cls) => void selectBy(row, { className: cls }),
    replace: (row) => {
      setStatus({ kind: 'idle' });
      setPicking(row);
    },
  };
  const targets = picking ? hitsForRow(pageWide ? (page.hits ?? []) : (scanned.hits ?? []), picking) : [];
  const candidates = picking ? [...classCandidates(picking, page.hits ?? []), ...(props.tokens ? designCandidates(picking, props.tokens.entries, props.tokens.mode) : [])] : [];
  const pick = (token: string) => {
    const hits = targets;
    setPicking(null);
    void replace(hits, token);
  };
  const title = scope === 'page' ? 'Page values' : props.selection.length > 1 ? 'Selection values' : 'Values';
  return (
    <InspectorSection title={title} className="sm-section" aside={<ScopeToggle scope={scope} onScope={setScope} />}>
      {scanned.hits === null && <p className="sm-empty">Reading values…</p>}
      {scanned.hits !== null && rows.length === 0 && <p className="sm-empty">{scope === 'page' ? 'No colors, sizes, radii or spacing found on this page.' : 'This selection sets no color, font size, radius or spacing of its own.'}</p>}
      {STYLE_KINDS.map((kind) => (
        <KindGroup key={kind} kind={kind} rows={rows.filter((row) => row.kind === kind)} actions={actions} replaceLabel={replaceLabel} />
      ))}
      {picking && <TokenPicker row={picking} candidates={candidates} target={`${targets.length === 1 ? '1 element' : `${new Set(targets.map((t) => t.selector)).size} elements`}${pageWide ? ' on this page' : ' in the selection'}`} onPick={pick} onClose={() => setPicking(null)} />}
      <StatusLine status={status} />
    </InspectorSection>
  );
}

function sameItems(a: SelectionContext[], b: SelectionContext[]): boolean {
  return a.length === b.length && a.every((item, i) => item === b[i]);
}

export default memo(InspectorMatch, (a, b) => a.projectId === b.projectId && a.directionId === b.directionId && a.port === b.port && a.tokens === b.tokens && a.drain === b.drain && sameItems(a.selection, b.selection));
