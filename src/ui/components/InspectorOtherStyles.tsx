import { useEffect, useRef, useState } from 'react';
import { formatCopyCss, otherStyles, type AuthoredCss } from '../authoredCss';
import type { AuthoredCssState } from '../useAuthoredCss';
import { Icon } from './Icon';

const COPIED_MS = 1500;

export function CopyCssButton({ authored }: { authored: AuthoredCssState }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  const copy = async () => {
    const css = await authored.request();
    let next: 'copied' | 'failed' = 'failed';
    if (css) {
      try {
        await navigator.clipboard.writeText(formatCopyCss(css));
        next = 'copied';
      } catch {
        next = 'failed';
      }
    }
    setState(next);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), COPIED_MS);
  };
  const label = state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy CSS';
  return (
    <button type="button" className="icon-btn small ins-copy-css" data-tip={state === 'idle' ? 'Copy CSS' : label} data-tip-align="end" onClick={() => void copy()}>
      <Icon name={state === 'copied' ? 'check' : 'copy'} size={14} />
      <span className="sr-only" aria-live="polite">
        {label}
      </span>
    </button>
  );
}

export function InspectorOtherStyles({ css }: { css: AuthoredCss | null }) {
  const [open, setOpen] = useState(false);
  const rows = css ? otherStyles(css) : [];
  if (rows.length === 0) return null;
  return (
    <section className="ins-section ins-other" aria-label="Other styles">
      <button type="button" className="ins-other-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={12} />
        <h3>Other styles</h3>
        <span className="ins-other-count">{rows.length}</span>
      </button>
      {open ? (
        <ul className="ins-other-list">
          {rows.map((row) => (
            <li key={row.prop} className="ins-other-row" data-tip={`${row.prop}: ${row.value}\nFrom ${row.source}`}>
              <span className="ins-other-decl">
                <span className="prop">{row.prop}</span>: <span className="value">{row.value}</span>
              </span>
              <span className="ins-other-source">{row.source}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
