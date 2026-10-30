import { useEffect, useMemo, useRef } from 'react';
import type { ShiftPart } from '../cssValues';
import { proxyEdit } from '../proxyEdit';
import { NEW_SHADOW, blurOf, formatShadows, parseShadows, withBlur, type Shadow } from '../shadows';
import type { DirectEdit } from '../useDirectEdit';
import { TokenUiContext, useTokenUi } from '../useTokenSnap';
import { Icon } from './Icon';
import { ColorField, InspectorSection } from './InspectorFields';
import { AddButton } from './InspectorShared';
import { NumberField } from './NumberField';

type Part = 'x' | 'y' | 'blur' | 'spread';

const PARTS: { part: Part; short: string; label: string; min?: number }[] = [
  { part: 'x', short: 'X', label: 'X offset' },
  { part: 'y', short: 'Y', label: 'Y offset' },
  { part: 'blur', short: 'B', label: 'Blur', min: 0 },
  { part: 'spread', short: 'S', label: 'Spread' },
];

type Field = Part | 'color';

interface ShadowView {
  list: Shadow[];
  mixed: ReadonlySet<string> | null;
}

const FIELDS: Field[] = ['x', 'y', 'blur', 'spread', 'color'];
let opCount = 0;

function eachList(raw: string, change: (list: Shadow[]) => Shadow[]): string {
  const list = parseShadows(raw);
  return list ? formatShadows(change(list)) : raw;
}

function fieldPart(index: number, field: Field): ShiftPart {
  return {
    key: `${index}.${field}`,
    map: (raw, change) => eachList(raw, (list) => list.map((s, i) => (i === index ? { ...s, [field]: change(s[field]) || (field === 'color' ? s.color : '0') } : s))),
  };
}

function writeShadows(edit: DirectEdit, view: ShadowView, change: (list: Shadow[]) => Shadow[]): void {
  if (view.mixed) {
    opCount += 1;
    edit.shift(['box-shadow'], 0, {}, { key: `op${opCount}`, map: (raw) => eachList(raw, change), set: '' });
  } else {
    edit.preview({ 'box-shadow': formatShadows(change(view.list)) });
  }
  edit.commit();
}

function mixedFields(lists: Shadow[][]): Set<string> {
  const first = lists[0] ?? [];
  const mixed = new Set<string>();
  first.forEach((shadow, index) => {
    for (const field of FIELDS) if (lists.some((list) => list[index]?.[field] !== shadow[field])) mixed.add(`${index}.${field}`);
  });
  return mixed;
}

function shadowView(edit: DirectEdit): ShadowView | null {
  if (!edit.mixed.has('box-shadow')) {
    const list = parseShadows(edit.values['box-shadow']);
    return list ? { list, mixed: null } : null;
  }
  const lists = (edit.each ?? []).map((values) => parseShadows(values['box-shadow']));
  const first = lists[0];
  if (!first || first.length === 0 || lists.some((list) => list === null || list.length !== first.length)) return null;
  const mixed = mixedFields(lists as Shadow[][]);
  return { list: first.map((shadow, index) => ({ ...shadow, ...Object.fromEntries(FIELDS.filter((field) => mixed.has(`${index}.${field}`)).map((field) => [field, ''])) })), mixed };
}

function ShadowRow({ edit, view, index }: { edit: DirectEdit; view: ShadowView; index: number }) {
  const { list } = view;
  const shadow = list[index] as Shadow;
  const n = index + 1;
  const replace = (patch: Partial<Shadow>) => ({ 'box-shadow': formatShadows(list.map((s, i) => (i === index ? { ...s, ...patch } : s))) });
  const fieldEdit = (field: Field, value: string, write: (next: string) => Partial<Shadow>) =>
    proxyEdit(edit, field === 'color' ? 'color' : 'width', value, (next) => replace(write(next)), ['box-shadow'], { part: fieldPart(index, field), mixed: view.mixed?.has(`${index}.${field}`) ?? false });
  const ui = useTokenUi();
  const colorUi = useMemo(() => {
    const request = ui?.requestCreate;
    return ui ? { ...ui, requestCreate: request ? (req: Parameters<typeof request>[0]) => request({ ...req, targets: [] }) : null } : null;
  }, [ui]);
  const colorEdit = fieldEdit('color', shadow.color, (color) => ({ color }));
  return (
    <li className="ins-shadow" aria-label={`Shadow ${n}`}>
      <div className="ins-shadow-head">
        <span className="ins-shadow-name">Shadow {n}</span>
        <button
          type="button"
          className="ins-chip-toggle"
          aria-pressed={shadow.inset}
          aria-label={`Shadow ${n} inset`}
          data-tip={shadow.inset ? 'Inner shadow' : 'Drop shadow'}
          onClick={() => writeShadows(edit, view, (own) => own.map((s, i) => (i === index ? { ...s, inset: !shadow.inset } : s)))}
        >
          Inset
        </button>
        <button
          type="button"
          className="icon-btn small"
          aria-label={`Remove shadow ${n}`}
          data-tip="Remove shadow"
          data-tip-align="end"
          onClick={() => writeShadows(edit, view, (own) => own.filter((_, i) => i !== index))}
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
              edit: fieldEdit(part, shadow[part], (value) => ({ [part]: value || '0' })),
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

const BLUR_PART: ShiftPart = { key: 'blur', map: (raw, change) => withBlur(raw, change(blurOf(raw) || '0')) };

function LayerBlur({ edit }: { edit: DirectEdit }) {
  const filter = edit.values.filter;
  const blur = proxyEdit(edit, 'width', blurOf(filter), (value) => ({ filter: withBlur(filter, value) }), ['filter'], { part: BLUR_PART });
  return <NumberField id="ins-layer-blur" short="Blur" tokens={false} spec={{ prop: 'width', label: 'Layer blur', edit: blur, min: 0 }} />;
}

function useScrollInOnMount(on: boolean) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (on) ref.current?.closest('section')?.scrollIntoView({ block: 'nearest' });
  }, []);
  return ref;
}

export function EffectsSection({ edit, revealed = false }: { edit: DirectEdit; revealed?: boolean }) {
  const view = shadowView(edit);
  const anchor = useScrollInOnMount(revealed);
  return (
    <InspectorSection title="Effects">
      <span ref={anchor} hidden />
      {view === null ? (
        <div className="ins-custom">
          <code className="ins-custom-value" data-tip={edit.values['box-shadow']}>
            {edit.values['box-shadow'] || 'Mixed'}
          </code>
          <button type="button" className="btn ghost small" onClick={() => writeShadows(edit, { list: [], mixed: null }, () => [])}>
            Clear
          </button>
        </div>
      ) : (
        view.list.length > 0 && (
          <ul className="ins-shadows">
            {view.list.map((_, index) => (
              <ShadowRow key={index} edit={edit} view={view} index={index} />
            ))}
          </ul>
        )
      )}
      {view !== null && (
        <div className="ins-add-row">
          <AddButton label="Shadow" onClick={() => writeShadows(edit, view, (own) => [...own, NEW_SHADOW])} />
        </div>
      )}
      <div className="ins-grid">
        <LayerBlur edit={edit} />
      </div>
    </InspectorSection>
  );
}
