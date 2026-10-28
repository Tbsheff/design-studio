import { lazy, Suspense, type JSX } from 'react';
import type { UiSelectProps } from './UiSelect';
import { Icon } from './Icon';

const UiSelect = lazy(() => import('./UiSelect').then((m) => ({ default: m.UiSelect as (p: UiSelectProps<string>) => JSX.Element })));

function Placeholder<V extends string>(p: UiSelectProps<V>) {
  const label = p.options.find((o) => o.value === p.value)?.label ?? p.placeholder ?? '';
  return (
    <span className={`ui-select-root ${p.className ?? ''}`}>
      <button id={p.id} type="button" role="combobox" className={`ui-select${p.size === 'sm' ? ' sm' : ''}`} aria-haspopup="listbox" aria-expanded={false} aria-label={p['aria-label']} disabled={p.disabled}>
        {p.icon}
        <span className="ui-select-value truncate">{label}</span>
        <Icon name="chevronDown" size={12} />
      </button>
    </span>
  );
}

export function LazySelect<V extends string>(p: UiSelectProps<V>) {
  return (
    <Suspense fallback={<Placeholder {...p} />}>
      <UiSelect {...(p as unknown as UiSelectProps<string>)} />
    </Suspense>
  );
}
