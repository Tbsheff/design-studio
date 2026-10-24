import { useEffect, useRef, type RefObject } from 'react';
import type { SelectionContext } from '../../shared/contracts';
import { PREVIEW_LAYOUT_KEY_EVENT } from '../usePreviewFrames';
import { isTypingTarget } from '../usePanZoom';
import type { DirectEdit } from '../useDirectEdit';
import { SIZE_MODES, activeCell, alignCell, isFlexDisplay, parentLayout, sizeModeOf, sizePatch, type Axis, type SizeMode } from '../sizing';
import { Icon, type IconName } from './Icon';
import { InspectorSection, SelectField } from './InspectorFields';
import { NumberField } from './NumberField';

type Patch = Parameters<DirectEdit['preview']>[0];

function write(edit: DirectEdit, patch: Patch): void {
  edit.preview(patch);
  edit.commit();
}

function isLayoutShortcut(event: KeyboardEvent): boolean {
  return event.code === 'KeyA' && event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey && !event.repeat;
}

function useAddLayoutKey(root: RefObject<HTMLElement | null>, onAdd: () => void): void {
  const latest = useRef(onAdd);
  latest.current = onAdd;
  useEffect(() => {
    const visible = () => Boolean(root.current && !root.current.closest('[inert]'));
    const onKey = (event: KeyboardEvent) => {
      if (!isLayoutShortcut(event) || isTypingTarget(event.target) || !visible()) return;
      event.preventDefault();
      latest.current();
    };
    const onForwarded = () => {
      if (visible()) latest.current();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(PREVIEW_LAYOUT_KEY_EVENT, onForwarded);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(PREVIEW_LAYOUT_KEY_EVENT, onForwarded);
    };
  }, [root]);
}

const DIRECTIONS: { value: string; icon: IconName; label: string }[] = [
  { value: 'row', icon: 'arrowRight', label: 'Horizontal' },
  { value: 'column', icon: 'arrowDown', label: 'Vertical' },
];

const POSITIONS = ['start', 'center', 'end'];

const DISPLAYS = ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'none'];

function AlignGrid({ edit, isRow }: { edit: DirectEdit; isRow: boolean }) {
  const active = activeCell(edit.values['justify-content'], edit.values['align-items'], isRow);
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
              title={label}
              onClick={() => {
                const cell = alignCell(col, row, isRow);
                write(edit, { 'justify-content': cell.justify, 'align-items': cell.align });
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

function FlexControls({ edit }: { edit: DirectEdit }) {
  const direction = edit.values['flex-direction'].startsWith('column') ? 'column' : 'row';
  const wraps = edit.values['flex-wrap'] === 'wrap' || edit.values['flex-wrap'] === 'wrap-reverse';
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
                title={option.label}
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
            title={wraps ? 'Wrap: on' : 'Wrap: off'}
            onClick={() => write(edit, { 'flex-wrap': wraps ? 'nowrap' : 'wrap' })}
          >
            <Icon name="wrap" size={14} />
          </button>
        </div>
        <NumberField short="Gap" spec={{ prop: 'gap', label: 'Gap', edit, min: 0 }} />
      </div>
    </div>
  );
}

export function AutoLayoutSection({ edit }: { edit: DirectEdit }) {
  const root = useRef<HTMLDivElement>(null);
  const flex = isFlexDisplay(edit.values.display);
  useAddLayoutKey(root, () => {
    if (!isFlexDisplay(edit.values.display)) write(edit, { display: 'flex' });
  });
  const remove = (
    <button type="button" className="icon-btn small" aria-label="Remove auto layout" title="Remove auto layout" onClick={() => write(edit, { display: 'block' })}>
      <Icon name="minus" size={14} />
    </button>
  );
  return (
    <InspectorSection title="Auto layout" aside={flex ? remove : undefined}>
      <div ref={root} className="ins-layout">
        <div className="ins-layout-row">
          <SelectField prop="display" label="Display" short="Display" edit={edit} options={DISPLAYS} />
          {!flex && (
            <button type="button" className="btn small has-icon ins-add-layout" aria-keyshortcuts="Shift+A" onClick={() => write(edit, { display: 'flex' })}>
              <Icon name="plus" size={14} />
              Add auto layout
              <kbd className="ins-kbd" aria-hidden="true">⇧A</kbd>
            </button>
          )}
        </div>
        {flex && <FlexControls edit={edit} />}
      </div>
    </InspectorSection>
  );
}

function SizeRow({ axis, edit, selection }: { axis: Axis; edit: DirectEdit; selection: SelectionContext }) {
  const parent = parentLayout(selection.styles);
  const mode = sizeModeOf(axis, edit.values, parent);
  const name = axis === 'width' ? 'Width' : 'Height';
  const used = selection.styles[`used-${axis}`] ?? edit.values[axis];
  return (
    <>
      <NumberField short={axis === 'width' ? 'W' : 'H'} spec={{ prop: axis, label: name, edit, min: 0 }} />
      <div className="ins-field select">
        <select
          className="ins-input ins-size-mode"
          aria-label={`${name} sizing`}
          value={mode}
          onChange={(event) => write(edit, sizePatch(axis, event.target.value as SizeMode, edit.values, parent, used))}
        >
          {SIZE_MODES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
          title={option.label}
          onClick={() => write(edit, { 'align-self': current === option.value ? '' : option.value })}
        >
          <Icon name={option.icon} size={14} />
        </button>
      ))}
    </div>
  );
}

export function SizeSection({ edit, selection }: { edit: DirectEdit; selection: SelectionContext }) {
  const parent = parentLayout(selection.styles);
  return (
    <InspectorSection title="Size">
      <div className="ins-grid">
        <SizeRow axis="width" edit={edit} selection={selection} />
        <SizeRow axis="height" edit={edit} selection={selection} />
      </div>
      {(parent.flex || parent.grid) && <AlignSelf edit={edit} column={parent.flex && !parent.row} />}
    </InspectorSection>
  );
}
