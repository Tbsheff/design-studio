import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { ARRANGE_SHORTCUTS, type ArrangeAction, type ArrangeResult } from '../../shared/arrange';
import type { SelectionContext } from '../../shared/contracts';
import { shortcutLabel, type KeyId } from '../../shared/keymap';
import { arrange as arrangeRequest, errorText } from '../api';
import type { PreviewPort } from '../bridge';
import { activeFrame, canvasStore, defaultLayout } from '../canvasFrames';
import { IS_MAC } from '../commands/keys';
import { parentLayout } from '../sizing';
import { uiStore } from '../storage';
import { isTypingTarget } from '../typingTarget';
import type { DirectEditCommit, DirectEditControl } from '../useDirectEdit';
import { PREVIEW_ARRANGE_KEY_EVENT } from '../usePreviewFrames';
import { Icon } from './Icon';

interface Props {
  projectId: string;
  directionId: string | null;
  selection: SelectionContext[];
  editable: boolean;
  port: MutableRefObject<PreviewPort | null>;
  control: MutableRefObject<DirectEditControl | null>;
  onCommitted: (commit: DirectEditCommit) => void;
  showBar: boolean;
}

type Message = { kind: 'ok' | 'note' | 'error'; text: string };

interface Tool {
  key: KeyId;
  label: string;
  glyph: string;
  action: ArrangeAction;
}

const ALIGN_TOOLS: Tool[] = [
  { key: 'align-left', label: 'Align left', glyph: 'M2.5 2v12M5 4.5h7V7H5zM5 9h4.5v2.5H5z', action: { align: 'left' } },
  { key: 'align-center', label: 'Align horizontal centers', glyph: 'M8 2v12M4 4.5h8V7H4zM5.5 9h5v2.5h-5z', action: { align: 'center' } },
  { key: 'align-right', label: 'Align right', glyph: 'M13.5 2v12M4 4.5h7V7H4zM6.5 9H11v2.5H6.5z', action: { align: 'right' } },
  { key: 'align-top', label: 'Align top', glyph: 'M2 2.5h12M4.5 5H7v7H4.5zM9 5h2.5v4.5H9z', action: { align: 'top' } },
  { key: 'align-middle', label: 'Align vertical centers', glyph: 'M2 8h12M4.5 4H7v8H4.5zM9 5.5h2.5v5H9z', action: { align: 'middle' } },
  { key: 'align-bottom', label: 'Align bottom', glyph: 'M2 13.5h12M4.5 4H7v7H4.5zM9 6.5h2.5V11H9z', action: { align: 'bottom' } },
];

const SPACE_TOOLS: Tool[] = [
  { key: 'distribute-h', label: 'Distribute horizontal spacing', glyph: 'M2.5 2v12M13.5 2v12M6.5 5h3v6h-3z', action: { distribute: 'horizontal' } },
  { key: 'distribute-v', label: 'Distribute vertical spacing', glyph: 'M2 2.5h12M2 13.5h12M5 6.5h6v3H5z', action: { distribute: 'vertical' } },
  { key: 'tidy-up', label: 'Tidy up', glyph: 'M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z', action: { tidy: true } },
];

const OK_MS = 3000;

function isAbsolute(selection: SelectionContext): boolean {
  const position = selection.styles.position ?? '';
  return position === 'absolute' || position === 'fixed';
}

export function arrangeShown(selection: SelectionContext[]): boolean {
  if (selection.length > 1) return true;
  const only = selection[0];
  if (!only) return false;
  const parent = parentLayout(only.styles);
  return isAbsolute(only) || parent.flex || parent.grid;
}

function minCount(action: ArrangeAction, selection: SelectionContext[]): number {
  if ('align' in action) return 1;
  if ('distribute' in action) return selection.length > 0 && selection.every(isAbsolute) ? 3 : 2;
  return 2;
}

function successText(result: ArrangeResult): string {
  const styles = result.writes.flatMap((w) => Object.entries(w.style));
  const set = styles.filter(([, value]) => value !== null).map(([prop, value]) => `${prop}: ${value}`);
  const removed = [...new Set(styles.filter(([, value]) => value === null).map(([prop]) => prop))];
  const wrote = result.classes.length > 0 ? `Wrote ${result.classes.join(' ')}` : set.length > 0 ? `Wrote ${set.join('; ')}` : '';
  const parts = [wrote, removed.length > 0 ? `Removed ${removed.join(', ')}` : '', result.note];
  return parts.filter(Boolean).join('. ') || 'Arranged';
}

function frameRequest(projectId: string): { path?: string; viewport: { width: number; height: number } } {
  const frame = activeFrame(canvasStore.get(projectId) ?? defaultLayout(uiStore.get().viewport));
  return { ...(frame.path ? { path: frame.path } : {}), viewport: { width: frame.width, height: frame.height } };
}

function commitWrites(props: Props, result: ArrangeResult): void {
  const selected = new Set(props.selection.map((s) => s.selector));
  for (const entry of result.writes) {
    if (!selected.has(entry.selector)) continue;
    const style = Object.fromEntries(Object.entries(entry.style).map(([prop, value]) => [prop, value ?? '']));
    props.onCommitted({ selector: entry.selector, style });
  }
  props.port.current?.refreshRects();
}

function useArrange(props: Props) {
  const latest = useRef(props);
  latest.current = props;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const busyRef = useRef(false);
  useEffect(() => {
    if (message?.kind !== 'ok') return;
    const timer = window.setTimeout(() => setMessage(null), OK_MS);
    return () => window.clearTimeout(timer);
  }, [message]);
  const key = props.selection.map((s) => s.selector).join('\n');
  useEffect(() => setMessage(null), [key]);
  const run = async (action: ArrangeAction) => {
    const cur = latest.current;
    if (!cur.directionId || busyRef.current || cur.selection.length === 0) return;
    busyRef.current = true;
    setBusy(true);
    setMessage(null);
    try {
      await cur.control.current?.settle();
      const targets = cur.selection.map((s) => ({ selector: s.selector }));
      const result = await arrangeRequest(cur.projectId, cur.directionId, { targets, action, ...frameRequest(cur.projectId) });
      commitWrites(cur, result);
      setMessage(result.changed ? { kind: 'ok', text: successText(result) } : { kind: 'note', text: result.note ?? 'Already aligned.' });
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  return { busy, message, run };
}

function chordOf(event: KeyboardEvent): string | null {
  if (event.metaKey || event.repeat || !event.altKey) return null;
  return `${event.ctrlKey ? 'Ctrl+' : ''}Alt+${event.shiftKey ? 'Shift+' : ''}${event.code}`;
}

function useArrangeKeys(root: MutableRefObject<HTMLElement | null>, active: boolean, run: (action: ArrangeAction) => void): void {
  const latest = useRef({ active, run });
  latest.current = { active, run };
  useEffect(() => {
    const ready = () => latest.current.active && Boolean(root.current && !root.current.closest('[inert]'));
    const fire = (chord: string | null, event?: Event) => {
      const action = chord ? ARRANGE_SHORTCUTS[chord] : undefined;
      if (!action || !ready()) return;
      event?.preventDefault();
      latest.current.run(action);
    };
    const onKey = (event: KeyboardEvent) => {
      if (!isTypingTarget(event.target)) fire(chordOf(event), event);
    };
    const onForwarded = (event: Event) => fire((event as CustomEvent<{ key?: string }>).detail?.key ?? null);
    window.addEventListener('keydown', onKey);
    window.addEventListener(PREVIEW_ARRANGE_KEY_EVENT, onForwarded);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(PREVIEW_ARRANGE_KEY_EVENT, onForwarded);
    };
  }, [root]);
}

function ToolButton({ tool, disabled, why, onRun }: { tool: Tool; disabled: boolean; why: string | null; onRun: (action: ArrangeAction) => void }) {
  const tip = why ? `${tool.label}: ${why}` : `${tool.label} ${shortcutLabel(tool.key, IS_MAC)}`;
  return (
    <button type="button" className="ins-tool" aria-label={tool.label} aria-keyshortcuts={shortcutLabel(tool.key, false)} disabled={disabled} data-tip={tip} onClick={() => onRun(tool.action)}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={tool.glyph} />
      </svg>
    </button>
  );
}

function ArrangeMessage({ message }: { message: Message | null }) {
  if (!message) return null;
  if (message.kind === 'ok') {
    return (
      <p className="ins-arrange-ok" role="status">
        <Icon name="check" size={12} />
        <span>{message.text}</span>
      </p>
    );
  }
  return (
    <div className={`ins-multi-note ins-arrange-note ${message.kind}`} role={message.kind === 'error' ? 'alert' : 'note'}>
      <Icon name="alert" size={14} />
      <span>{message.text}</span>
    </div>
  );
}

function ArrangeBar({ selection, busy, onRun }: { selection: SelectionContext[]; busy: boolean; onRun: (action: ArrangeAction) => void }) {
  const button = (tool: Tool) => {
    const need = minCount(tool.action, selection);
    const why = selection.length < need ? `select ${need} or more elements` : null;
    return <ToolButton key={tool.key} tool={tool} disabled={busy || why !== null} why={why} onRun={onRun} />;
  };
  return (
    <div className="ins-tools ins-arrange" role="toolbar" aria-label="Arrange">
      {ALIGN_TOOLS.map(button)}
      <span className="ins-tools-sep" aria-hidden="true" />
      {SPACE_TOOLS.map(button)}
    </div>
  );
}

export function InspectorArrange(props: Props) {
  const root = useRef<HTMLDivElement>(null);
  const arrange = useArrange(props);
  const active = props.editable && props.selection.length > 0 && props.directionId !== null;
  useArrangeKeys(root, active, (action) => void arrange.run(action));
  const shown = props.showBar && active && arrangeShown(props.selection);
  return (
    <div ref={root} className="ins-arrange-wrap" data-shown={shown || undefined}>
      {shown && <ArrangeBar selection={props.selection} busy={arrange.busy} onRun={(action) => void arrange.run(action)} />}
      <ArrangeMessage message={arrange.message} />
    </div>
  );
}
