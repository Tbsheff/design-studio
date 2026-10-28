import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { SelectionContext } from '../../shared/contracts';
import { PREVIEW_ARRANGE_KEY_EVENT, PREVIEW_LAYOUT_KEY_EVENT } from '../usePreviewFrames';
import { isTypingTarget } from '../typingTarget';
import type { DirectEdit } from '../useDirectEdit';
import { PIN_OPTIONS, pinFields, pinModeOf, pinPatch, type InsetProp, type PinAxis, type PinMode } from '../constraints';
import { SIZE_MODES, activeCell, alignCell, isFlexDisplay, isGridDisplay, parentLayout, sizeFacts, sizeModeOf, sizePatch, type Axis, type SizeFacts, type SizeMode } from '../sizing';
import { Icon, type IconName } from './Icon';
import { InspectorSection, SelectField } from './InspectorFields';
import { NumberField } from './NumberField';
import { UiSelect } from './UiSelect';

type Patch = Parameters<DirectEdit['preview']>[0];

function write(edit: DirectEdit, patch: Patch): void {
  edit.preview(patch);
  edit.commit();
}

function isLayoutShortcut(event: KeyboardEvent): boolean {
  return event.code === 'KeyA' && event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey && !event.repeat;
}

const REMOVE_LAYOUT_CHORD = 'Alt+Shift+KeyA';

function isRemoveShortcut(event: KeyboardEvent): boolean {
  return event.code === 'KeyA' && event.shiftKey && event.altKey && !event.metaKey && !event.ctrlKey && !event.repeat;
}

function useLayoutKeys(root: RefObject<HTMLElement | null>, onAdd: () => void, onRemove: () => void): void {
  const latest = useRef({ onAdd, onRemove });
  latest.current = { onAdd, onRemove };
  useEffect(() => {
    const visible = () => Boolean(root.current && !root.current.closest('[inert]'));
    const onKey = (event: KeyboardEvent) => {
      const add = isLayoutShortcut(event);
      if ((!add && !isRemoveShortcut(event)) || isTypingTarget(event.target) || !visible()) return;
      event.preventDefault();
      if (add) latest.current.onAdd();
      else latest.current.onRemove();
    };
    const onForwarded = () => {
      if (visible()) latest.current.onAdd();
    };
    const onArrangeKey = (event: Event) => {
      if ((event as CustomEvent<{ key?: string }>).detail?.key === REMOVE_LAYOUT_CHORD && visible()) latest.current.onRemove();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(PREVIEW_LAYOUT_KEY_EVENT, onForwarded);
    window.addEventListener(PREVIEW_ARRANGE_KEY_EVENT, onArrangeKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(PREVIEW_LAYOUT_KEY_EVENT, onForwarded);
      window.removeEventListener(PREVIEW_ARRANGE_KEY_EVENT, onArrangeKey);
    };
  }, [root]);
}

const DIRECTIONS: { value: string; icon: IconName; label: string }[] = [
  { value: 'row', icon: 'arrowRight', label: 'Horizontal' },
  { value: 'column', icon: 'arrowDown', label: 'Vertical' },
];

const POSITIONS = ['start', 'center', 'end'];

const DISPLAYS = ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'none'];

function gridValue(value: string): string {
  if (value === 'flex-start') return 'start';
  if (value === 'flex-end') return 'end';
  return value;
}

function AlignGrid({ edit, isRow, grid = false }: { edit: DirectEdit; isRow: boolean; grid?: boolean }) {
  const justifyProp = grid ? 'justify-items' : 'justify-content';
  const active = activeCell(edit.values[justifyProp], edit.values['align-items'], isRow);
  return (
    <div className="ins-align-grid" role="group" aria-label="Alignment">
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => {
          const on = active?.col === col && active.row === row;
          const label = `Align ${POSITIONS[row]} ${POSITIONS[col]}`;
          return (
            <button
              key={`${row}-${col}`}
              type="button"
              className={on ? 'on' : ''}
              aria-label={label}
              aria-pressed={on}
              data-tip={label}
              onClick={() => {
                const cell = alignCell(col, row, isRow);
                write(edit, grid ? { 'justify-items': gridValue(cell.justify), 'align-items': gridValue(cell.align) } : { 'justify-content': cell.justify, 'align-items': cell.align });
              }}
            >
              <span className="ins-align-dot" aria-hidden="true" />
            </button>
          );
        }),
      )}
    </div>
  );
}

type GapMode = 'fixed' | 'auto';

const GAP_MODES: { value: GapMode; label: string }[] = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'auto', label: 'Auto' },
];

const DEFAULT_GAP = '8px';

function useLastGap(edit: DirectEdit): string {
  const last = useRef(parseFloat(edit.values.gap) > 0 ? edit.values.gap : DEFAULT_GAP);
  if (parseFloat(edit.values.gap) > 0) last.current = edit.values.gap;
  return last.current;
}

function GapModeField({ edit }: { edit: DirectEdit }) {
  const mode: GapMode = edit.values['justify-content'] === 'space-between' ? 'auto' : 'fixed';
  const lastGap = useLastGap(edit);
  const change = (next: GapMode) => {
    if (next === mode) return;
    write(edit, next === 'auto' ? { 'justify-content': 'space-between', gap: '' } : { 'justify-content': '', gap: lastGap });
  };
  return (
    <div className="ins-field select ins-gap-mode" data-tip="Auto puts the space between the children" data-tip-align="end">
      <span className="ins-scrub static">Gap</span>
      <UiSelect className="ins-select" aria-label="Gap mode" value={mode} options={GAP_MODES} onChange={change} />
    </div>
  );
}

function GapFields({ edit, split, auto }: { edit: DirectEdit; split: boolean; auto: boolean }) {
  if (split) {
    return (
      <div className="ins-gap-pair">
        <NumberField short="Row" spec={{ prop: 'row-gap', label: 'Row gap', edit, min: 0 }} />
        <NumberField short="Col" spec={{ prop: 'column-gap', label: 'Column gap', edit, min: 0 }} />
      </div>
    );
  }
  if (auto) return null;
  return <NumberField short="Gap" spec={{ prop: 'gap', label: 'Gap', edit, min: 0 }} />;
}

function GridControls({ edit }: { edit: DirectEdit }) {
  return (
    <div className="ins-flex">
      <AlignGrid edit={edit} isRow grid />
      <div className="ins-flex-side">
        <GapFields edit={edit} split auto={false} />
      </div>
    </div>
  );
}

function FlexControls({ edit }: { edit: DirectEdit }) {
  const direction = edit.values['flex-direction'].startsWith('column') ? 'column' : 'row';
  const wraps = edit.values['flex-wrap'] === 'wrap' || edit.values['flex-wrap'] === 'wrap-reverse';
  const auto = edit.values['justify-content'] === 'space-between';
  return (
    <div className="ins-flex">
      <AlignGrid edit={edit} isRow={direction === 'row'} />
      <div className="ins-flex-side">
        <div className="ins-flex-row">
          <div className="segmented icons ins-direction" role="group" aria-label="Direction">
            {DIRECTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={direction === option.value ? 'on' : ''}
                aria-label={option.label}
                aria-pressed={direction === option.value}
                data-tip={option.label}
                onClick={() => write(edit, { 'flex-direction': option.value })}
              >
                <Icon name={option.icon} size={14} />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="icon-btn ins-toggle"
            aria-label="Wrap"
            aria-pressed={wraps}
            data-tip={wraps ? 'Wrap: on' : 'Wrap: off'}
            onClick={() => write(edit, { 'flex-wrap': wraps ? 'nowrap' : 'wrap' })}
          >
            <Icon name="wrap" size={14} />
          </button>
        </div>
        <GapModeField edit={edit} />
        <GapFields edit={edit} split={wraps} auto={auto} />
      </div>
    </div>
  );
}

export function AutoLayoutSection({ edit, title = 'Auto layout', lead, children }: { edit: DirectEdit; title?: string; lead?: ReactNode; children?: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const flex = isFlexDisplay(edit.values.display);
  const grid = isGridDisplay(edit.values.display);
  useLayoutKeys(
    root,
    () => {
      if (!isFlexDisplay(edit.values.display) && !isGridDisplay(edit.values.display)) write(edit, { display: 'flex' });
    },
    () => {
      if (isFlexDisplay(edit.values.display)) write(edit, { display: 'block' });
    },
  );
  const remove = (
    <button type="button" className="icon-btn small" aria-label="Remove auto layout" aria-keyshortcuts="Alt+Shift+A" data-tip="Remove auto layout ⌥⇧A" data-tip-align="end" onClick={() => write(edit, { display: 'block' })}>
      <Icon name="minus" size={14} />
    </button>
  );
  return (
    <InspectorSection title={title} aside={flex ? remove : undefined}>
      {lead}
      <div ref={root} className="ins-layout">
        <div className="ins-layout-row">
          <SelectField prop="display" label="Display" short="Display" edit={edit} options={DISPLAYS} />
          {!flex && !grid && (
            <button type="button" className="btn small has-icon ins-add-layout" aria-keyshortcuts="Shift+A" data-tip="⇧A" data-tip-align="end" onClick={() => write(edit, { display: 'flex' })}>
              <Icon name="plus" size={14} />
              Add auto layout
            </button>
          )}
        </div>
        {flex && <FlexControls edit={edit} />}
        {grid && <GridControls edit={edit} />}
      </div>
      {children}
    </InspectorSection>
  );
}

function liveFacts(edit: DirectEdit, selection: SelectionContext): SizeFacts {
  const facts = sizeFacts(selection.styles);
  const drafted = (['width', 'height'] as const).filter((axis) => edit.dirty.includes(axis));
  return drafted.length === 0 ? facts : { ...facts, authored: { ...facts.authored, ...Object.fromEntries(drafted.map((axis) => [axis, edit.values[axis].trim()])) } };
}

function SizeRow({ axis, edit, selection }: { axis: Axis; edit: DirectEdit; selection: SelectionContext }) {
  const parent = parentLayout(selection.styles);
  const facts = liveFacts(edit, selection);
  const mode = sizeModeOf(axis, edit.values, parent, facts);
  const name = axis === 'width' ? 'Width' : 'Height';
  const used = selection.styles[`used-${axis}`] ?? edit.values[axis];
  return (
    <>
      <NumberField short={axis === 'width' ? 'W' : 'H'} spec={{ prop: axis, label: name, edit, min: 0 }} />
      <div className="ins-field select ins-size-field">
        <UiSelect className="ins-select ins-size-mode" aria-label={`${name} sizing`} value={mode} options={SIZE_MODES} onChange={(next: SizeMode) => write(edit, sizePatch(axis, next, edit.values, parent, used, facts))} />
      </div>
    </>
  );
}

const SELF: { value: string; icon: IconName; label: string }[] = [
  { value: 'flex-start', icon: 'selfStart', label: 'Align self start' },
  { value: 'center', icon: 'selfCenter', label: 'Align self center' },
  { value: 'flex-end', icon: 'selfEnd', label: 'Align self end' },
  { value: 'stretch', icon: 'selfStretch', label: 'Align self stretch' },
];

function selfSlot(value: string): string {
  if (value === 'start' || value === 'self-start') return 'flex-start';
  if (value === 'end' || value === 'self-end') return 'flex-end';
  return value;
}

function AlignSelf({ edit, column }: { edit: DirectEdit; column: boolean }) {
  const current = selfSlot(edit.values['align-self']);
  return (
    <div className={`segmented icons ins-self ${column ? 'column' : ''}`} role="group" aria-label="Align self">
      {SELF.map((option) => (
        <button
          key={option.value}
          type="button"
          className={current === option.value ? 'on' : ''}
          aria-label={option.label}
          aria-pressed={current === option.value}
          data-tip={option.label}
          onClick={() => write(edit, { 'align-self': current === option.value ? '' : option.value })}
        >
          <Icon name={option.icon} size={14} />
        </button>
      ))}
    </div>
  );
}

const LIMITS = [
  { prop: 'min-width', short: 'Min W', label: 'Min width' },
  { prop: 'max-width', short: 'Max W', label: 'Max width' },
  { prop: 'min-height', short: 'Min H', label: 'Min height' },
  { prop: 'max-height', short: 'Max H', label: 'Max height' },
] as const;

const UNSET_LIMITS = new Set(['', 'auto', 'none', '0', '0px']);

function limitsSet(edit: DirectEdit): boolean {
  return LIMITS.some((limit) => !UNSET_LIMITS.has(edit.values[limit.prop].trim()));
}

export function MinMaxRows({ edit }: { edit: DirectEdit }) {
  const [open, setOpen] = useState(false);
  if (!open && !limitsSet(edit)) {
    return (
      <p className="ins-add-links ins-limits-add">
        <button type="button" className="ins-add-link" onClick={() => setOpen(true)}>
          + Min/Max
        </button>
      </p>
    );
  }
  return (
    <div className="ins-grid ins-limits">
      {LIMITS.map((limit) => (
        <NumberField key={limit.prop} short={limit.short} spec={{ prop: limit.prop, label: limit.label, edit, min: 0 }} />
      ))}
    </div>
  );
}

const IN_FLOW = { position: '', top: '', right: '', bottom: '', left: '' };

function isPositioned(value: string): boolean {
  return value === 'absolute' || value === 'fixed';
}

function PositionRows({ edit, selection }: { edit: DirectEdit; selection: SelectionContext }) {
  const on = isPositioned(edit.values.position);
  const toggle = () => {
    if (on) write(edit, IN_FLOW);
    else write(edit, { position: 'absolute', left: selection.styles['offset-left'] || '0px', top: selection.styles['offset-top'] || '0px' });
  };
  return (
    <>
      <div className="ins-layout-row">
        <button
          type="button"
          className="btn small has-icon ins-abs-toggle"
          aria-pressed={on}
          data-tip={on ? 'Put the element back in the flow' : 'Take the element out of the flow. X and Y count from the nearest positioned ancestor.'}
          onClick={toggle}
        >
          <Icon name={on ? 'check' : 'frame'} size={14} />
          Absolute position
        </button>
      </div>
      {on && <ConstraintRows edit={edit} selection={selection} />}
    </>
  );
}

const INSET_FIELDS: Record<InsetProp, { short: string; label: string }> = {
  left: { short: 'X', label: 'Left (X)' },
  right: { short: 'R', label: 'Right' },
  top: { short: 'Y', label: 'Top (Y)' },
  bottom: { short: 'B', label: 'Bottom' },
};

const PIN_TIPS: Record<PinAxis, string> = {
  x: 'How the element follows when its container gets wider or narrower',
  y: 'How the element follows when its container gets taller or shorter',
};

function PinSelect({ axis, mode, edit, selection, onPick }: { axis: PinAxis; mode: PinMode; edit: DirectEdit; selection: SelectionContext; onPick: (axis: PinAxis, mode: PinMode) => void }) {
  const change = (next: PinMode) => {
    if (next === mode) return;
    edit.preview(pinPatch(axis, next, selection.styles, mode), true);
    edit.commit();
    onPick(axis, next);
  };
  return (
    <div className="ins-field select ins-pin" data-tip={PIN_TIPS[axis]} data-tip-align="end">
      <span className="ins-scrub static">{axis === 'x' ? 'H' : 'V'}</span>
      <UiSelect className="ins-select" aria-label={axis === 'x' ? 'Horizontal constraint' : 'Vertical constraint'} value={mode} options={PIN_OPTIONS[axis]} onChange={change} />
    </div>
  );
}

function usePinModes(selection: SelectionContext): { modes: Record<PinAxis, PinMode>; pick: (axis: PinAxis, mode: PinMode) => void } {
  const authored = ['left', 'right', 'top', 'bottom'].map((side) => selection.styles[`authored-${side}`] ?? '').join('|');
  const [picked, setPicked] = useState<{ key: string; modes: Partial<Record<PinAxis, PinMode>> }>({ key: authored, modes: {} });
  const fresh = picked.key === `${selection.selector}|${authored}` ? picked.modes : {};
  const modes = { x: fresh.x ?? pinModeOf('x', selection.styles), y: fresh.y ?? pinModeOf('y', selection.styles) };
  const pick = (axis: PinAxis, mode: PinMode) => setPicked({ key: `${selection.selector}|${authored}`, modes: { ...fresh, [axis]: mode } });
  return { modes, pick };
}

function ConstraintRows({ edit, selection }: { edit: DirectEdit; selection: SelectionContext }) {
  const { modes, pick } = usePinModes(selection);
  const fields = [...pinFields('x', modes.x), ...pinFields('y', modes.y)];
  return (
    <>
      {fields.length > 0 && (
        <div className="ins-grid">
          {fields.map((prop) => (
            <NumberField key={prop} short={INSET_FIELDS[prop].short} spec={{ prop, label: INSET_FIELDS[prop].label, edit }} />
          ))}
        </div>
      )}
      <div className="ins-grid ins-constraints" role="group" aria-label="Constraints">
        <PinSelect axis="x" mode={modes.x} edit={edit} selection={selection} onPick={pick} />
        <PinSelect axis="y" mode={modes.y} edit={edit} selection={selection} onPick={pick} />
      </div>
    </>
  );
}

export function SizeRows({ edit, selection }: { edit: DirectEdit; selection: SelectionContext }) {
  const parent = parentLayout(selection.styles);
  return (
    <>
      <div className="ins-grid">
        <SizeRow axis="width" edit={edit} selection={selection} />
        <SizeRow axis="height" edit={edit} selection={selection} />
      </div>
      <MinMaxRows edit={edit} />
      {(parent.flex || parent.grid) && !isPositioned(edit.values.position) && <AlignSelf edit={edit} column={parent.flex && !parent.row} />}
      <PositionRows edit={edit} selection={selection} />
    </>
  );
}

export function SizeSection({ edit, selection }: { edit: DirectEdit; selection: SelectionContext }) {
  return (
    <InspectorSection title="Size">
      <SizeRows edit={edit} selection={selection} />
    </InspectorSection>
  );
}
