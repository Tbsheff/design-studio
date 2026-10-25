import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { CopyCodeFormat } from '../../shared/export';
import { activeExportFrame, exportApi, openExport } from '../exportApi';
import { usePopover } from '../usePopover';
import { Icon, type IconName } from './Icon';
import '../styles/export.css';

interface Props {
  projectId: string;
  directionId: string | null;
  selector: string;
}

type State = { kind: 'idle' } | { kind: 'busy' } | { kind: 'copied'; label: string } | { kind: 'failed'; message: string };

const RESET_MS = 1600;

function menuKeys(event: KeyboardEvent<HTMLElement>, close: (refocus: boolean) => void): void {
  if (event.key === 'Tab') close(false);
  const steps: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };
  const step = steps[event.key];
  if (!step) return;
  event.preventDefault();
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  items[(Math.max(0, index) + step + items.length) % items.length]?.focus();
}

function writeWhenReady(text: Promise<string>): Promise<void> {
  if (typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function') {
    const blob = text.then((value) => new Blob([value], { type: 'text/plain' }));
    return navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]).catch(async (error: unknown) => {
      const value = await text;
      await navigator.clipboard.writeText(value).catch(() => {
        throw error;
      });
    });
  }
  return text.then((value) => navigator.clipboard.writeText(value));
}

export function CopyCodeMenu({ projectId, directionId, selector }: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | null>(null);
  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);
  usePopover(open, root, close);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    if (open) root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [open]);

  const settle = (next: State) => {
    setState(next);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState({ kind: 'idle' }), RESET_MS);
  };

  const copy = async (label: string, produce: () => Promise<string | null>) => {
    const text = produce().then((value) => {
      if (!value) throw new Error('Nothing to copy');
      return value;
    });
    const written = writeWhenReady(text);
    close(true);
    setState({ kind: 'busy' });
    try {
      await written;
      settle({ kind: 'copied', label });
    } catch (error) {
      settle({ kind: 'failed', message: error instanceof Error ? error.message : String(error) });
    }
  };

  const code = (format: CopyCodeFormat) => async () => {
    if (!directionId) return null;
    return (await exportApi.copyCode(projectId, { directionId, selector, format, frame: activeExportFrame(projectId) })).code;
  };

  const items: { label: string; icon: IconName; run: () => void }[] = [
    { label: 'Copy HTML and CSS', icon: 'code', run: () => void copy('HTML', code('html')) },
    { label: 'Copy Tailwind', icon: 'code', run: () => void copy('Tailwind', code('tailwind')) },
    { label: 'Export PNG…', icon: 'image', run: () => {
      close(false);
      openExport({ format: 'png', selector });
    } },
  ];

  const label = state.kind === 'busy' ? 'Copying code' : state.kind === 'copied' ? `Copied ${state.label}` : state.kind === 'failed' ? `Copy failed: ${state.message}` : 'Copy as code';
  const icon: IconName = state.kind === 'copied' ? 'check' : state.kind === 'failed' ? 'alert' : 'code';
  return (
    <div className="copy-code-root" ref={root}>
      <button
        ref={trigger}
        type="button"
        className={`icon-btn small copy-code-trigger${state.kind === 'busy' ? ' busy' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        data-tip={open ? undefined : label}
        data-tip-align="end"
        onClick={() => setOpen((value) => !value)}
      >
        {state.kind === 'busy' ? <span className="spinner" /> : <Icon name={icon} size={14} />}
      </button>
      <span className="sr-only" aria-live="polite">
        {state.kind === 'idle' ? '' : label}
      </span>
      {open ? (
        <div className="project-menu copy-code-menu" role="menu" aria-label="Copy element" onKeyDown={(e) => menuKeys(e, close)}>
          {items.map((item) => (
            <button key={item.label} type="button" role="menuitem" tabIndex={-1} onClick={item.run}>
              <Icon name={item.icon} size={14} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
