import { memo, useEffect, type MutableRefObject } from 'react';
import { DEFAULT_BREAKPOINTS, parseVariant, variantPrefix, type ParsedVariant, type VariantState, type VariantSupport } from '../../shared/variants';
import type { PreviewPort } from '../bridge';
import { editVariantStore, fitFrameTo, postForceState, useEditVariant } from '../editVariant';
import { UiSelect } from './UiSelect';
import '../styles/inspector-variants.css';

interface Props {
  selector: string;
  port: MutableRefObject<PreviewPort | null>;
  support: VariantSupport | null;
  quietNote?: string | null;
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

function Chip({ label, pressed, tip, onClick }: { label: string; pressed: boolean; tip: string; onClick: () => void }) {
  return (
    <button type="button" className={`ins-variant-chip ${pressed ? 'on' : ''}`} aria-pressed={pressed} data-tip={tip} onClick={onClick}>
      {label}
    </button>
  );
}

function summary(prefix: string, support: VariantSupport | null): string {
  if (support?.mode === 'none') return support.reason ?? 'This element cannot take variant styles.';
  if (prefix === '') return 'Edits change the base style.';
  const set = support?.set ?? [];
  const where = support?.mode === 'css' ? 'a CSS rule' : 'classes';
  if (set.length === 0) return `Nothing set yet. Edits write ${where}; dim values come from the base.`;
  return `Set here: ${set.join(support?.mode === 'css' ? '; ' : ' ')}. Dim values come from the base.`;
}

const ANY_WIDTH = '';

function InspectorVariantBarView({ selector, port, support, quietNote }: Props) {
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
  const note = summary(prefix, support);
  if (off) return note === quietNote ? null : <p className="ins-variant-note ins-variants-off">{note}</p>;
  const toggleState = (state: VariantState) => choose({ ...current, states: current.states.includes(state) ? [] : [state] });
  const widths = [{ value: ANY_WIDTH, label: 'All widths' }, ...breakpoints.map((entry) => ({ value: entry.name, label: `${entry.name} ${entry.px}+` }))];

  return (
    <div className="ins-variants" role="group" aria-label="Breakpoint and state">
      <div className="ins-variant-row">
        <UiSelect size="sm" className="ins-variant-width" aria-label="Breakpoint" tip="Edit styles from this width up. The frame resizes to it" value={current.breakpoint ?? ANY_WIDTH} options={widths} onChange={(name) => choose({ ...current, breakpoint: name === ANY_WIDTH ? null : name })} />
        <span className="ins-variant-sep" aria-hidden="true" />
        {STATES.map((state) => (
          <Chip key={state.id} label={state.label} pressed={current.states.includes(state.id)} tip={`${state.label} state. The frame shows the element as if ${state.id === 'hover' ? 'hovered' : state.id === 'focus' ? 'focused' : 'pressed'}`} onClick={() => toggleState(state.id)} />
        ))}
        <Chip label="Dark" pressed={current.dark} tip="Dark mode. The frame shows the dark theme" onClick={() => choose({ ...current, dark: !current.dark })} />
      </div>
      {prefix !== '' && (
        <p className="ins-variant-note" role="status">
          <code className="ins-variant-prefix">{prefix}</code>
          <span>{note}</span>
          <button type="button" className="ins-add-link ins-variant-base" onClick={() => choose(BASE)}>
            Base
          </button>
        </p>
      )}
    </div>
  );
}

export const InspectorVariantBar = memo(InspectorVariantBarView);

export default InspectorVariantBar;
