import { useMemo } from 'react';
import type { ColorTweak, RangeTweak, SelectTweak, ToggleTweak, TweakControl, TweakValue } from '../../shared/tweaks';
import type { TweaksDraft } from '../useTweaks';
import { Icon } from './Icon';
import { ColorValue } from './TokenInputs';

interface Props {
  draft: TweaksDraft;
  running: boolean;
  onSuggest: () => void;
}

interface Group {
  label: string;
  controls: TweakControl[];
}

function groupControls(controls: TweakControl[]): Group[] {
  const groups = new Map<string, TweakControl[]>();
  for (const control of controls) {
    const label = control.group ?? 'General';
    groups.set(label, [...(groups.get(label) ?? []), control]);
  }
  return [...groups].map(([label, list]) => ({ label, controls: list }));
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function readout(control: TweakControl, value: TweakValue): string {
  if (control.type === 'range') return `${value}${control.unit ?? ''}`;
  if (control.type === 'toggle') return value === true ? 'On' : 'Off';
  if (control.type === 'select') return control.options.find((option) => option.value === value)?.label ?? String(value);
  return String(value);
}

type EditFn = (control: TweakControl, value: TweakValue) => void;

function RangeInput({ control, value, onEdit }: { control: RangeTweak; value: number; onEdit: EditFn }) {
  const id = `twk-${control.id}`;
  return (
    <input
      id={id}
      type="range"
      className="twk-range"
      min={control.min}
      max={control.max}
      step={control.step ?? 'any'}
      value={value}
      aria-valuetext={readout(control, value)}
      onChange={(event) => onEdit(control, Number(event.currentTarget.value))}
    />
  );
}

function ToggleInput({ control, value, onEdit }: { control: ToggleTweak; value: boolean; onEdit: EditFn }) {
  return (
    <button id={`twk-${control.id}`} type="button" role="switch" aria-checked={value} className={`twk-switch ${value ? 'on' : ''}`} onClick={() => onEdit(control, !value)}>
      <span className="twk-switch-knob" aria-hidden="true" />
    </button>
  );
}

function SelectInput({ control, value, onEdit }: { control: SelectTweak; value: string; onEdit: EditFn }) {
  return (
    <select id={`twk-${control.id}`} className="ins-input twk-select" value={value} onChange={(event) => onEdit(control, event.currentTarget.value)}>
      {control.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ColorInput({ control, value, onEdit }: { control: ColorTweak; value: string; onEdit: EditFn }) {
  return <ColorValue label={control.label} value={value} swatch={value} onChange={(next) => onEdit(control, next)} />;
}

function ControlInput({ control, value, onEdit }: { control: TweakControl; value: TweakValue; onEdit: EditFn }) {
  if (control.type === 'range') return <RangeInput control={control} value={Number(value)} onEdit={onEdit} />;
  if (control.type === 'toggle') return <ToggleInput control={control} value={value === true} onEdit={onEdit} />;
  if (control.type === 'select') return <SelectInput control={control} value={String(value)} onEdit={onEdit} />;
  return <ColorInput control={control} value={String(value)} onEdit={onEdit} />;
}

function ControlRow({ control, value, changed, draft }: { control: TweakControl; value: TweakValue; changed: boolean; draft: TweaksDraft }) {
  const labelFor = control.type === 'color' ? undefined : `twk-${control.id}`;
  return (
    <li className={`twk-row twk-row-${control.type} ${changed ? 'changed' : ''}`} data-tweak={control.id}>
      <div className="twk-row-head">
        <label className="twk-label truncate" htmlFor={labelFor} title={control.cssVar}>
          {control.label}
        </label>
        {control.type !== 'color' && <span className="twk-readout">{readout(control, value)}</span>}
        <button
          type="button"
          className={`icon-btn small twk-reset ${changed ? '' : 'hidden'}`}
          aria-label={`Reset ${control.label}`}
          title="Reset"
          disabled={!changed}
          onClick={() => draft.revert(control.id)}
        >
          <Icon name="undo" size={12} />
        </button>
      </div>
      <ControlInput control={control} value={value} onEdit={draft.edit} />
    </li>
  );
}

function Footer({ draft }: { draft: TweaksDraft }) {
  if (draft.count === 0 && !draft.commitError) return null;
  return (
    <div className="twk-footer">
      {draft.commitError && (
        <p className="twk-error twk-commit-error" role="alert">
          <Icon name="alert" size={13} />
          {draft.commitError}
        </p>
      )}
      {draft.count > 0 && (
        <div className="twk-footer-bar">
          <span className="twk-count" aria-live="polite">
            {draft.count} {draft.count === 1 ? 'change' : 'changes'}
          </span>
          <button type="button" className="btn small ghost" disabled={draft.committing} onClick={draft.discard}>
            Discard
          </button>
          <button type="button" className="btn small primary" disabled={draft.committing} onClick={() => void draft.commit()}>
            {draft.committing ? 'Committing…' : 'Commit'}
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ running, onSuggest }: { running: boolean; onSuggest: () => void }) {
  return (
    <div className="twk-empty">
      <span className="twk-empty-icon" aria-hidden="true">
        <Icon name="settings" size={18} />
      </span>
      <h3 className="twk-empty-title">No tweaks yet</h3>
      <p className="twk-empty-text">Tweaks are live controls for this design: sliders, colors, switches and menus, each bound to a CSS variable. Drag them to preview every frame at once with no model call. Commit saves the values as one version.</p>
      <button type="button" className="btn small primary" disabled={running} onClick={onSuggest}>
        <Icon name="sparkle" size={13} />
        Suggest tweaks
      </button>
      {running && <p className="twk-empty-note">Wait for the current run to finish.</p>}
    </div>
  );
}

function Problems({ problems }: { problems: string[] }) {
  if (problems.length === 0) return null;
  return (
    <div className="twk-problems" role="status">
      <Icon name="alert" size={13} />
      <div>
        <p className="twk-problems-head">{problems.length === 1 ? 'One control does not change the page yet' : `${problems.length} problems: some controls do not change the page yet`}</p>
        <ul>
          {problems.slice(0, 4).map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Header({ draft, running, onSuggest, hasControls }: Props & { hasControls: boolean }) {
  return (
    <div className="twk-header">
      <strong className="twk-title">Tweaks</strong>
      <div className="twk-header-end">
        {draft.count > 0 && (
          <button type="button" className="btn small ghost" onClick={draft.discard}>
            Reset all
          </button>
        )}
        {hasControls && (
          <button type="button" className="btn small ghost" disabled={running} title={running ? 'Wait for the current run to finish' : 'Ask the agent for tweak controls'} onClick={onSuggest}>
            <Icon name="sparkle" size={13} />
            Suggest
          </button>
        )}
      </div>
    </div>
  );
}

export function TweaksPanel({ draft, running, onSuggest }: Props) {
  const state = draft.state;
  const groups = useMemo(() => groupControls(state?.controls ?? []), [state?.controls]);
  const hasControls = groups.length > 0;
  return (
    <div className="twk">
      <Header draft={draft} running={running} onSuggest={onSuggest} hasControls={hasControls} />
      {state?.error && (
        <p className="twk-error" role="alert">
          <Icon name="alert" size={13} />
          {state.error}
        </p>
      )}
      {!state && draft.loadError && (
        <p className="twk-error" role="alert">
          <Icon name="alert" size={13} />
          {draft.loadError}
        </p>
      )}
      <div className="twk-scroll">
        {state && !hasControls && <EmptyState running={running} onSuggest={onSuggest} />}
        {state && <Problems problems={state.problems} />}
        {groups.map((group) => (
          <section key={group.label} className="twk-section" aria-labelledby={`twk-sec-${slug(group.label)}`}>
            <h3 className="twk-section-head" id={`twk-sec-${slug(group.label)}`}>
              {group.label}
            </h3>
            <ul className="twk-list">
              {group.controls.map((control) => (
                <ControlRow key={control.id} control={control} value={draft.values[control.id] ?? control.default} changed={draft.pending[control.id] !== undefined} draft={draft} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Footer draft={draft} />
    </div>
  );
}
