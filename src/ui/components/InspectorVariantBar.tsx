import { useEffect, type MutableRefObject } from 'react';
import { DEFAULT_BREAKPOINTS, parseVariant, variantPrefix, type ParsedVariant, type VariantState, type VariantSupport } from '../../shared/variants';
import type { PreviewPort } from '../bridge';
import { editVariantStore, fitFrameTo, postForceState, useEditVariant } from '../editVariant';
import '../styles/inspector-variants.css';

interface Props {
  selector: string;
  port: MutableRefObject<PreviewPort | null>;
  support: VariantSupport | null;
}

const STATES: { id: VariantState; label: string }[] = [
  { id: 'hover', label: 'Hover' },
  { id: 'focus', label: 'Focus' },
  { id: 'active', label: 'Active' },
];
const SHOWN_BREAKPOINTS = 4;
const BASE: ParsedVariant = { breakpoint: null, dark: false, states: [] };

function breakpointsOf(support: VariantSupport | null) {
  const list = support?.breakpoints.length ? support.breakpoints : DEFAULT_BREAKPOINTS;
  return list.slice(0, SHOWN_BREAKPOINTS);
}

function Chip({ label, pressed, disabled, tip, onClick }: { label: string; pressed: boolean; disabled: boolean; tip: string; onClick: () => void }) {
  return (
    <button type="button" className={`ins-variant-chip ${pressed ? 'on' : ''}`} aria-pressed={pressed} disabled={disabled} data-tip={tip} onClick={onClick}>
      {label}
    </button>
  );
}

function summary(prefix: string, support: VariantSupport | null): string {
  if (prefix === '') return 'Edits change the base style';
  if (support?.mode === 'none') return support.reason ?? 'This element cannot take variant styles';
  const count = support?.props.length ?? 0;
  const where = support?.mode === 'css' ? 'a CSS rule' : 'classes';
  return count === 0 ? `Edits write ${where} for this variant. Dim values come from the base` : `${count} ${count === 1 ? 'value is' : 'values are'} set here. Dim values come from the base`;
}

export function InspectorVariantBar({ selector, port, support }: Props) {
  const prefix = useEditVariant();
  const current = parseVariant(prefix) ?? BASE;
  const off = support?.mode === 'none';
  const breakpoints = breakpointsOf(support);

  useEffect(() => {
    if (prefix !== '') postForceState(port.current, selector, prefix);
  }, [port, selector, prefix]);

  const choose = (next: ParsedVariant) => {
    const value = variantPrefix(next);
    const width = next.breakpoint ? (breakpoints.find((entry) => entry.name === next.breakpoint)?.px ?? null) : null;
    port.current?.post({ type: 'preview-reset' });
    editVariantStore.set(value);
    fitFrameTo(width);
    postForceState(port.current, selector, value);
  };
  const toggleBreakpoint = (name: string) => choose({ ...current, breakpoint: current.breakpoint === name ? null : name });
  const toggleState = (state: VariantState) => choose({ ...current, states: current.states.includes(state) ? [] : [state] });

  return (
    <div className="ins-variants" role="group" aria-label="Breakpoint and state">
      <div className="ins-variant-row">
        <Chip label="Base" pressed={prefix === ''} disabled={false} tip="Edit the base style, for every width and state" onClick={() => choose(BASE)} />
        {breakpoints.map((entry) => (
          <Chip key={entry.name} label={entry.name} pressed={current.breakpoint === entry.name} disabled={off} tip={off ? (support?.reason ?? '') : `${entry.name}: ${entry.px} px and wider. The frame resizes to ${entry.px}`} onClick={() => toggleBreakpoint(entry.name)} />
        ))}
        <span className="ins-variant-sep" aria-hidden="true" />
        {STATES.map((state) => (
          <Chip key={state.id} label={state.label} pressed={current.states.includes(state.id)} disabled={off} tip={off ? (support?.reason ?? '') : `${state.label} state. The frame shows the element as if ${state.id === 'hover' ? 'hovered' : state.id === 'focus' ? 'focused' : 'pressed'}`} onClick={() => toggleState(state.id)} />
        ))}
        <Chip label="Dark" pressed={current.dark} disabled={off} tip={off ? (support?.reason ?? '') : 'Dark mode. The frame shows the dark theme'} onClick={() => choose({ ...current, dark: !current.dark })} />
      </div>
      <p className="ins-variant-note" role="status">
        {prefix !== '' && <code className="ins-variant-prefix">{prefix}</code>}
        <span>{summary(prefix, support)}</span>
      </p>
    </div>
  );
}

export default InspectorVariantBar;
