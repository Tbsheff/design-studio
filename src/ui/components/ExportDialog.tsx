import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { EXPORT_SCALES, type EditorInfo, type ExportFormat, type ExportFrame, type ExportScale, type ExportScope, type HandoffResult, type McpStatus } from '../../shared/export';
import { downloadBlob } from '../format';
import { canRevealDownload, canvasFrameChoices, exportApi, readExportPrefs, revealDownload, saveExportPrefs, type ExportTarget, type FrameChoice } from '../exportApi';
import { MCP_WAKE_EVENT } from '../mcpApprovals';
import { useModalDialog } from '../usePopover';
import { Icon, type IconName } from './Icon';
import '../styles/export.css';

interface Props {
  target: ExportTarget;
  onClose: () => void;
}

interface FormatInfo {
  id: ExportFormat;
  label: string;
  icon: IconName;
  hint: string;
  action: string;
}

const FORMATS: FormatInfo[] = [
  { id: 'png', label: 'PNG', icon: 'image', hint: 'One image per frame. Many frames download as a zip.', action: 'Export PNG' },
  { id: 'pdf', label: 'PDF', icon: 'doc', hint: 'One page per frame, at 2× for sharp print.', action: 'Export PDF' },
  { id: 'html', label: 'HTML', icon: 'code', hint: 'One file with CSS, fonts and images inside. Opens offline.', action: 'Export HTML' },
  { id: 'zip', label: 'Source', icon: 'folder', hint: 'The project files of this version as a zip.', action: 'Export zip' },
  { id: 'handoff', label: 'Handoff', icon: 'terminal', hint: 'A folder for a coding agent: HANDOFF.md, tokens, screens and source.', action: 'Create handoff' },
];

const MOBILE_MAX = 600;
const MOBILE_FRAME = { name: 'Mobile', width: 390, height: 844 };

type Status = { kind: 'idle' } | { kind: 'busy'; startedAt: number } | { kind: 'done'; text: string; note: string | null; reveal: boolean } | { kind: 'error'; text: string };

const RADIO_STEP: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (i, n) => (i + 1) % n,
  ArrowDown: (i, n) => (i + 1) % n,
  ArrowLeft: (i, n) => (i - 1 + n) % n,
  ArrowUp: (i, n) => (i - 1 + n) % n,
};

function onRadioKey(event: KeyboardEvent<HTMLDivElement>): void {
  const step = RADIO_STEP[event.key];
  if (!step) return;
  const radios = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)'));
  const index = radios.indexOf(document.activeElement as HTMLButtonElement);
  if (index < 0) return;
  event.preventDefault();
  const next = radios[step(index, radios.length)];
  next?.focus();
  next?.click();
}

function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string; icon?: IconName }[]; onChange: (value: T) => void }) {
  return (
    <div className="segmented export-seg" role="radiogroup" aria-label={label} onKeyDown={onRadioKey}>
      {options.map((option) => (
        <button key={option.id} type="button" role="radio" aria-checked={value === option.id} tabIndex={value === option.id ? 0 : -1} className={value === option.id ? 'on' : ''} onClick={() => onChange(option.id)}>
          {option.icon ? <Icon name={option.icon} size={14} /> : null}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function useElapsed(status: Status): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (status.kind !== 'busy') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [status.kind]);
  return status.kind === 'busy' ? Math.max(0, Math.floor((now - status.startedAt) / 1000)) : 0;
}

function useCopied(): [string | null, (key: string, text: string) => void] {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  const copy = (key: string, text: string) => {
    void navigator.clipboard.writeText(text).then(
      () => {
        setCopied(key);
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(null), 1500);
      },
      () => setCopied(null),
    );
  };
  return [copied, copy];
}

function HandoffResultView({ target, result, editors, onError }: { target: ExportTarget; result: HandoffResult; editors: EditorInfo[]; onError: (text: string) => void }) {
  const [copied, copy] = useCopied();
  const folder = result.path.split('/').pop() ?? '';
  const run = (task: () => Promise<void>) => void task().catch((error: unknown) => onError(error instanceof Error ? error.message : String(error)));
  return (
    <div className="export-handoff-result">
      <div className="export-path" title={result.path}>
        <Icon name="folder" size={14} />
        <span className="truncate">…/handoff/{folder}</span>
      </div>
      <p className="export-sub">{result.files.length} files. Paste the prompt into Claude Code to build the design.</p>
      <div className="export-row-actions">
        <button type="button" className="btn small primary has-icon" onClick={() => copy('prompt', result.prompt)}>
          <Icon name={copied === 'prompt' ? 'check' : 'copy'} size={14} />
          <span aria-live="polite">{copied === 'prompt' ? 'Copied' : 'Copy prompt for Claude Code'}</span>
        </button>
        <button type="button" className="btn small has-icon" onClick={() => run(async () => {
          const zip = await exportApi.handoffZip(target.projectId, folder);
          downloadBlob(zip.blob, zip.name);
        })}>
          <Icon name="download" size={14} />
          Download zip
        </button>
        <button type="button" className="btn small ghost" onClick={() => run(() => exportApi.revealHandoff(target.projectId, folder))}>
          Reveal in Finder
        </button>
      </div>
      {editors.length > 0 && target.directionId ? (
        <div className="export-editors">
          <span className="export-label">Open project in</span>
          {editors.map((editor) => (
            <button key={editor.id} type="button" className="btn small ghost" onClick={() => run(() => exportApi.openInEditor(target.projectId, target.directionId as string, editor.id))}>
              {editor.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ConnectClaudeCode() {
  const [status, setStatus] = useState<McpStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, copy] = useCopied();
  useEffect(() => {
    let live = true;
    exportApi.mcpStatus().then((s) => live && setStatus(s), (e: unknown) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, []);
  const change = async (input: { enabled?: boolean; control?: boolean; rotate?: boolean }) => {
    setBusy(true);
    setError(null);
    try {
      setStatus(await exportApi.setMcp(input));
      window.dispatchEvent(new Event(MCP_WAKE_EVENT));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const on = status?.enabled === true;
  const control = status?.control === true;
  return (
    <section className="export-connect" aria-label="Connect to Claude Code">
      <div className="export-connect-head">
        <div className="titles">
          <h3>Connect to Claude Code</h3>
          <p className="export-sub">A local MCP server lets Claude Code read projects, tokens, DESIGN.md and screenshots. Runs on this Mac only.</p>
        </div>
        <button type="button" role="switch" aria-checked={on} aria-label="MCP server" className={`export-switch${on ? ' on' : ''}`} disabled={busy || status === null} onClick={() => void change({ enabled: !on })}>
          <span className="export-switch-knob" />
        </button>
      </div>
      {status?.error || error ? (
        <div className="alert error small" role="alert">
          {status?.error ?? error}
        </div>
      ) : null}
      {on && status?.command ? (
        <>
          <div className="export-command">
            <code className="truncate" title={status.command}>{status.command}</code>
            <button type="button" className="btn small has-icon" onClick={() => copy('mcp', status.command as string)}>
              <Icon name={copied === 'mcp' ? 'check' : 'copy'} size={14} />
              <span aria-live="polite">{copied === 'mcp' ? 'Copied' : 'Copy command'}</span>
            </button>
          </div>
          <div className="export-connect-head export-control">
            <div className="titles">
              <h4>Allow control</h4>
              <p className="export-sub">
                {control
                  ? 'Claude Code can also create projects, start and stop runs, comment, arrange the canvas and export. You approve stop, restore, design system changes and writes outside the usual folders here. Reconnect the server in Claude Code after you change this.'
                  : 'Off: Claude Code can only read. Turn on to let it create projects, start runs, comment, arrange the canvas and export.'}
              </p>
            </div>
            <button type="button" role="switch" aria-checked={control} aria-label="Allow control" className={`export-switch${control ? ' on' : ''}`} disabled={busy} onClick={() => void change({ control: !control })}>
              <span className="export-switch-knob" />
            </button>
          </div>
          <div className="export-connect-foot">
            <span className="export-sub">{status.running ? `Running at ${status.url}` : 'Not running'}</span>
            <button type="button" className="btn small ghost" disabled={busy} onClick={() => void change({ rotate: true })}>
              New token
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

interface Options {
  format: ExportFormat;
  scale: ExportScale;
  scope: ExportScope;
  frames: FrameChoice[];
  picked: Set<string>;
  chosen: ExportFrame[];
  selectionOnly: boolean;
  needsFrames: boolean;
  choose: (next: ExportFormat) => void;
  chooseScale: (next: ExportScale) => void;
  chooseScope: (next: ExportScope) => void;
  toggle: (id: string) => void;
}

function useExportOptions(target: ExportTarget): Options {
  const initial = useMemo(readExportPrefs, []);
  const [format, setFormat] = useState<ExportFormat>(target.format ?? (target.selector ? 'png' : initial.format));
  const [scale, setScale] = useState<ExportScale>(initial.scale);
  const [scope, setScope] = useState<ExportScope>(initial.scope);
  const frames = useMemo(() => canvasFrameChoices(target.projectId, target.directionId), [target.projectId, target.directionId]);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(frames.map((f) => f.id)));
  const selectionOnly = Boolean(target.selector) && format === 'png';
  return {
    format,
    scale,
    scope,
    frames,
    picked,
    chosen: frames.filter((f) => picked.has(f.id)).map((f) => f.frame),
    selectionOnly,
    needsFrames: format !== 'zip' && !selectionOnly,
    choose: (next) => {
      setFormat(next);
      saveExportPrefs({ format: next, scale, scope });
    },
    chooseScale: (next) => {
      setScale(next);
      saveExportPrefs({ format, scale: next, scope });
    },
    chooseScope: (next) => {
      setScope(next);
      saveExportPrefs({ format, scale, scope: next });
    },
    toggle: (id) =>
      setPicked((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
  };
}

function useEditors(active: boolean): EditorInfo[] {
  const [editors, setEditors] = useState<EditorInfo[]>([]);
  useEffect(() => {
    if (!active || editors.length > 0) return;
    let live = true;
    exportApi.editors().then((list) => live && setEditors(list), () => undefined);
    return () => {
      live = false;
    };
  }, [active, editors.length]);
  return editors;
}

async function exportOnce(target: ExportTarget, options: Options): Promise<Status> {
  const selectionFrame = options.frames.find((f) => f.active)?.frame ?? options.chosen[0];
  const useSelection = options.selectionOnly && target.selector && selectionFrame;
  const file = await exportApi.exportFile(target.projectId, {
    format: options.format as Exclude<ExportFormat, 'handoff'>,
    versionId: target.versionId,
    frames: useSelection && selectionFrame ? [selectionFrame] : options.chosen,
    scale: options.scale,
    scope: options.scope,
    ...(useSelection ? { selector: target.selector } : {}),
  });
  downloadBlob(file.blob, file.name);
  return { kind: 'done', text: `Saved ${file.name}`, note: file.note, reveal: canRevealDownload() };
}

function handoffFrames(chosen: ExportFrame[]): ExportFrame[] {
  return chosen.some((f) => f.width <= MOBILE_MAX) ? chosen : [...chosen, MOBILE_FRAME];
}

function FrameList({ options }: { options: Options }) {
  return (
    <fieldset className="export-field export-frames">
      <legend className="export-label">{options.format === 'html' ? 'Pages from frames' : 'Frames'}</legend>
      {options.frames.map((choice) => (
        <label key={choice.id} className="export-frame">
          <input type="checkbox" checked={options.picked.has(choice.id)} onChange={() => options.toggle(choice.id)} />
          <span className="export-frame-name">{choice.frame.name}</span>
          {choice.frame.path ? <span className="export-frame-path truncate">/{choice.frame.path}</span> : null}
          <span className="export-frame-size">
            {choice.frame.width} × {choice.frame.height}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function OptionFields({ options }: { options: Options }) {
  const { format, chosen, scale, scope, selectionOnly } = options;
  const first = chosen[0];
  return (
    <>
      {selectionOnly ? (
        <div className="export-field">
          <span className="export-label">Area</span>
          <span className="export-selection">
            <Icon name="pointer" size={14} />
            Selected element
          </span>
        </div>
      ) : null}
      {options.needsFrames ? <FrameList options={options} /> : null}
      {format === 'png' ? (
        <div className="export-field export-inline">
          <span className="export-label">Scale</span>
          <Segmented label="Scale" value={scale} options={EXPORT_SCALES.map((s) => ({ id: s, label: `${s}×` }))} onChange={options.chooseScale} />
          {first && !selectionOnly ? <span className="export-sub export-size">{first.width * scale} px wide</span> : null}
        </div>
      ) : null}
      {(format === 'png' && !selectionOnly) || format === 'pdf' ? (
        <div className="export-field export-inline">
          <span className="export-label">Area</span>
          <Segmented label="Area" value={scope} options={[{ id: 'page' as ExportScope, label: 'Full page' }, { id: 'frame' as ExportScope, label: 'Frame only' }]} onChange={options.chooseScope} />
        </div>
      ) : null}
    </>
  );
}

function StatusLine({ status, handoff }: { status: Status; handoff: boolean }) {
  const elapsed = useElapsed(status);
  return (
    <div className="export-status" aria-live="polite">
      {status.kind === 'busy' ? (
        <span className="export-progress">
          <span className="spinner" />
          {handoff ? 'Building handoff' : 'Exporting'}… <span className="tabular">{elapsed} s</span>
        </span>
      ) : null}
      {status.kind === 'done' ? (
        <span className="export-done">
          <Icon name="check" size={14} />
          <span className="truncate" title={status.text}>
            {status.text}
          </span>
          {status.note ? <span className="export-sub">· {status.note}</span> : null}
          {status.reveal ? (
            <button type="button" className="btn small ghost" onClick={revealDownload}>
              Reveal in Finder
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

function actionLabel(info: FormatInfo, status: Status, rebuilt: boolean): string {
  if (status.kind === 'error') return 'Try again';
  return rebuilt ? 'Rebuild handoff' : info.action;
}

export function ExportDialog({ target, onClose }: Props) {
  const options = useExportOptions(target);
  const { format } = options;
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [handoff, setHandoff] = useState<HandoffResult | null>(null);
  const editors = useEditors(format === 'handoff');
  const busy = status.kind === 'busy';
  const dialog = useModalDialog(() => (busy ? false : onClose()));
  const info = FORMATS.find((f) => f.id === format) ?? (FORMATS[0] as FormatInfo);
  const canRun = !busy && (!options.needsFrames || options.chosen.length > 0);
  const shown = format === 'handoff' ? handoff : null;

  const run = async () => {
    if (!canRun) return;
    setStatus({ kind: 'busy', startedAt: Date.now() });
    try {
      if (format === 'handoff') {
        setHandoff(await exportApi.handoff(target.projectId, { versionId: target.versionId, frames: handoffFrames(options.chosen) }));
        setStatus({ kind: 'idle' });
        return;
      }
      setStatus(await exportOnce(target, options));
    } catch (error) {
      setStatus({ kind: 'error', text: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <dialog ref={dialog.ref} className="modal export-dialog" aria-label="Export" onMouseDown={dialog.onMouseDown}>
      <div className="modal-head">
        <div className="titles">
          <h2>Export</h2>
          <p className="truncate" title={target.versionLabel}>
            {target.versionLabel}
          </p>
        </div>
        <button className="icon-btn" aria-label="Close export" onClick={onClose} disabled={busy}>
          <Icon name="close" />
        </button>
      </div>
      <div className="modal-body export-body" aria-busy={busy}>
        <Segmented
          label="Format"
          value={format}
          options={FORMATS.map((f) => ({ id: f.id, label: f.label, icon: f.icon }))}
          onChange={(next) => {
            options.choose(next);
            setStatus({ kind: 'idle' });
          }}
        />
        <p className="export-sub export-hint">{info.hint}</p>
        <OptionFields options={options} />
        {shown ? <HandoffResultView target={target} result={shown} editors={editors} onError={(text) => setStatus({ kind: 'error', text })} /> : null}
        {format === 'handoff' ? <ConnectClaudeCode /> : null}
        {status.kind === 'error' ? (
          <div className="alert error small" role="alert">
            {status.text}
          </div>
        ) : null}
      </div>
      <div className="modal-foot">
        <StatusLine status={status} handoff={format === 'handoff'} />
        <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
          Close
        </button>
        <button type="button" className={`btn has-icon${shown ? '' : ' primary'}`} disabled={!canRun} onClick={() => void run()} data-autofocus>
          <Icon name={format === 'handoff' ? 'terminal' : 'download'} size={14} />
          {actionLabel(info, status, shown !== null)}
        </button>
      </div>
    </dialog>
  );
}
