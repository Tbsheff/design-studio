import { useMemo } from 'react';
import { proxyEdit } from '../proxyEdit';
import { NEW_SHADOW, blurOf, formatShadows, parseShadows, withBlur, type Shadow } from '../shadows';
import type { DirectEdit } from '../useDirectEdit';
import { TokenUiContext, useTokenUi } from '../useTokenSnap';
import { Icon } from './Icon';
import { ColorField, InspectorSection } from './InspectorFields';
import { NumberField } from './NumberField';

type Part = 'x' | 'y' | 'blur' | 'spread';

const PARTS: { part: Part; short: string; label: string; min?: number }[] = [
  { part: 'x', short: 'X', label: 'X offset' },
  { part: 'y', short: 'Y', label: 'Y offset' },
  { part: 'blur', short: 'B', label: 'Blur', min: 0 },
  { part: 'spread', short: 'S', label: 'Spread' },
];

function writeShadows(edit: DirectEdit, list: Shadow[]): void {
  edit.preview({ 'box-shadow': formatShadows(list) });
  edit.commit();
}

function ShadowRow({ edit, list, index }: { edit: DirectEdit; list: Shadow[]; index: number }) {
  const shadow = list[index] as Shadow;
  const n = index + 1;
  const replace = (patch: Partial<Shadow>) => ({ 'box-shadow': formatShadows(list.map((s, i) => (i === index ? { ...s, ...patch } : s))) });
  const ui = useTokenUi();
  const colorUi = useMemo(() => (ui ? { ...ui, requestCreate: (req: Parameters<typeof ui.requestCreate>[0]) => ui.requestCreate({ ...req, targets: [] }) } : null), [ui]);
  const colorEdit = proxyEdit(edit, 'color', shadow.color, (color) => replace({ color }), ['box-shadow']);
  return (
    <li className="ins-shadow" aria-label={`Shadow ${n}`}>
      <div className="ins-shadow-head">
        <span className="ins-shadow-name">Shadow {n}</span>
        <button
          type="button"
          className="ins-chip-toggle"
          aria-pressed={shadow.inset}
          aria-label={`Shadow ${n} inset`}
          title={shadow.inset ? 'Inner shadow' : 'Drop shadow'}
          onClick={() => writeShadows(edit, list.map((s, i) => (i === index ? { ...s, inset: !s.inset } : s)))}
        >
          Inset
        </button>
        <button
          type="button"
          className="icon-btn small"
          aria-label={`Remove shadow ${n}`}
          title="Remove shadow"
          onClick={() => writeShadows(edit, list.filter((_, i) => i !== index))}
        >
          <Icon name="minus" size={14} />
        </button>
      </div>
      <div className="ins-grid">
        {PARTS.map(({ part, short, label, min }) => (
          <NumberField
            key={part}
            id={`ins-shadow-${index}-${part}`}
            short={short}
            tokens={false}
            spec={{
              prop: 'width',
              label: `Shadow ${n} ${label.toLowerCase()}`,
              min,
              edit: proxyEdit(edit, 'width', shadow[part], (value) => replace({ [part]: value || '0' }), ['box-shadow']),
            }}
          />
        ))}
      </div>
      <TokenUiContext.Provider value={colorUi}>
        <ColorField prop="color" label={`Shadow ${n} color`} short="Color" edit={colorEdit} />
      </TokenUiContext.Provider>
    </li>
  );
}

function LayerBlur({ edit }: { edit: DirectEdit }) {
  const filter = edit.values.filter;
  const blur = proxyEdit(edit, 'width', blurOf(filter), (value) => ({ filter: withBlur(filter, value) }), ['filter']);
  return <NumberField id="ins-layer-blur" short="Blur" tokens={false} spec={{ prop: 'width', label: 'Layer blur', edit: blur, min: 0 }} />;
}

export function EffectsSection({ edit }: { edit: DirectEdit }) {
  const list = edit.mixed.has('box-shadow') ? null : parseShadows(edit.values['box-shadow']);
  const add = (
    <button
      type="button"
      className="icon-btn small"
      aria-label="Add shadow"
      title="Add shadow"
      onClick={() => writeShadows(edit, [...(list ?? []), NEW_SHADOW])}
    >
      <Icon name="plus" size={14} />
    </button>
  );
  return (
    <InspectorSection title="Effects" aside={add}>
      {list === null ? (
        <div className="ins-custom">
          <code className="ins-custom-value" title={edit.values['box-shadow']}>
            {edit.values['box-shadow'] || 'Mixed'}
          </code>
          <button type="button" className="btn ghost small" onClick={() => writeShadows(edit, [])}>
            Clear
          </button>
        </div>
      ) : (
        list.length > 0 && (
          <ul className="ins-shadows">
            {list.map((_, index) => (
              <ShadowRow key={index} edit={edit} list={list} index={index} />
            ))}
          </ul>
        )
      )}
      <div className="ins-grid">
        <LayerBlur edit={edit} />
      </div>
    </InspectorSection>
  );
}
