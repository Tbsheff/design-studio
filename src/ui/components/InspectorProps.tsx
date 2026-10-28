import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { SelectionContext } from '../../shared/contracts';
import type { ComponentInstance, PropSpec, PropValue, VariantGroup } from '../../shared/props';
import { ApiError } from '../api';
import { useProjectEvents } from '../events';
import { propsApi } from '../propsApi';
import { ComponentPreviewThumb } from './ComponentPreviewThumb';
import { InspectorSection } from './InspectorFields';
import { UiSelect } from './UiSelect';
import '../styles/inspector-props.css';

interface InspectorPropsProps {
  projectId: string;
  directionId: string | null;
  selection: SelectionContext;
  editable: boolean;
}

type Status = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; text: string } | { kind: 'error'; text: string };

function messageOf(error: unknown): string {
  if (error instanceof ApiError && error.data && typeof (error.data as { message?: unknown }).message === 'string') return (error.data as { message: string }).message;
  return error instanceof Error ? error.message : String(error);
}

function useInstance(projectId: string, directionId: string | null, selection: SelectionContext) {
  const [instance, setInstance] = useState<ComponentInstance | null>(null);
  const [loaded, setLoaded] = useState(false);
  const query = useRef({ owners: selection.owners, usedAt: selection.usedAt ?? null });
  query.current = { owners: selection.owners, usedAt: selection.usedAt ?? null };
  const key = JSON.stringify([selection.owners?.map((owner) => owner.stack), selection.usedAt ?? null]);
  const live = useRef(0);
  const load = useCallback(() => {
    const { owners, usedAt } = query.current;
    if (!directionId || ((owners?.length ?? 0) === 0 && !usedAt)) {
      setInstance(null);
      setLoaded(true);
      return;
    }
    const ticket = ++live.current;
    propsApi
      .instance(projectId, directionId, { owners, usedAt })
      .then((result) => ticket === live.current && setInstance(result.instance))
      .catch(() => ticket === live.current && setInstance(null))
      .finally(() => ticket === live.current && setLoaded(true));
  }, [projectId, directionId, key]);
  useEffect(load, [load]);
  const refresh = useCallback(() => {
    if (!directionId || !instance) return;
    const ticket = ++live.current;
    propsApi
      .instance(projectId, directionId, { use: instance.use })
      .then((result) => ticket === live.current && setInstance(result.instance))
      .catch(() => undefined);
  }, [projectId, directionId, instance]);
  useProjectEvents(projectId, (event) => {
    if (event.type === 'version.created' && event.directionId === directionId) refresh();
  });
  return { instance, loaded, setInstance };
}

function valueOf(instance: ComponentInstance, spec: PropSpec): PropValue | undefined {
  return instance.values[spec.name] ?? spec.default;
}

function SelectProp({ spec, value, overridden, disabled, onChange }: { spec: PropSpec; value: PropValue | undefined; overridden: boolean; disabled: boolean; onChange: (value: PropValue | null) => void }) {
  const current = value === undefined ? '' : String(value);
  const options = spec.options ?? [];
  const list = current && !options.includes(current) ? [current, ...options] : options;
  return (
    <div className={`ins-field select prp-field${overridden ? ' set' : ''}`}>
      <label htmlFor={`prp-${spec.name}`} className="ins-scrub static prp-name" data-tip={spec.name}>
        {spec.name}
      </label>
      <UiSelect
        id={`prp-${spec.name}`}
        className="ins-select"
        aria-label={`${spec.name} prop`}
        value={current}
        placeholder="—"
        disabled={disabled}
        options={list.map((option) => ({ value: option, label: option === spec.default && option !== 'default' ? `${option} (default)` : option }))}
        onChange={(next) => onChange(next === '' ? null : next)}
      />
    </div>
  );
}

function BooleanProp({ spec, value, disabled, onChange }: { spec: PropSpec; value: PropValue | undefined; disabled: boolean; onChange: (value: PropValue | null) => void }) {
  const on = value === true || value === 'true';
  return (
    <div className="prp-bool">
      <span className="prp-name" id={`prp-${spec.name}-label`}>
        {spec.name}
      </span>
      <button type="button" role="switch" aria-checked={on} aria-labelledby={`prp-${spec.name}-label`} className={`prp-switch${on ? ' on' : ''}`} disabled={disabled} onClick={() => onChange(!on)}>
        <span className="prp-switch-knob" />
      </button>
    </div>
  );
}

function TextProp({ spec, value, disabled, onChange }: { spec: PropSpec; value: PropValue | undefined; disabled: boolean; onChange: (value: PropValue | null) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === undefined ? '' : String(value));
  const commit = () => {
    if (draft === null) return;
    const next = draft;
    setDraft(null);
    if (next === (value === undefined ? '' : String(value))) return;
    if (next.trim() === '') onChange(null);
    else onChange(spec.control === 'number' ? Number(next) : next);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') commit();
    if (event.key === 'Escape') {
      event.stopPropagation();
      setDraft(null);
    }
  };
  return (
    <div className="ins-field wide prp-field">
      <label htmlFor={`prp-${spec.name}`} className="ins-scrub static prp-name" data-tip={spec.name}>
        {spec.name}
      </label>
      <input id={`prp-${spec.name}`} className="ins-input" aria-label={`${spec.name} prop`} type={spec.control === 'number' ? 'number' : 'text'} value={shown} placeholder={spec.node ? 'Text' : ''} disabled={disabled} spellCheck={false} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={onKeyDown} />
    </div>
  );
}

function PropRow({ instance, spec, disabled, onChange }: { instance: ComponentInstance; spec: PropSpec; disabled: boolean; onChange: (name: string, value: PropValue | null) => void }) {
  const value = valueOf(instance, spec);
  const locked = instance.dynamic.includes(spec.name);
  const change = (next: PropValue | null) => onChange(spec.name, next);
  if (locked) {
    return (
      <div className="ins-field wide readonly prp-field">
        <span className="ins-scrub static prp-name">{spec.name}</span>
        <span className="ins-value">Set by code</span>
      </div>
    );
  }
  if (spec.control === 'select') return <SelectProp spec={spec} value={value} overridden={spec.name in instance.values} disabled={disabled} onChange={change} />;
  if (spec.control === 'boolean') return <BooleanProp spec={spec} value={value} disabled={disabled} onChange={change} />;
  return <TextProp spec={spec} value={value} disabled={disabled} onChange={change} />;
}

const PADDING: { label: string; props: string[] }[] = [
  { label: 'Padding X', props: ['padding-left', 'padding-right'] },
  { label: 'Padding Y', props: ['padding-top', 'padding-bottom'] },
];

type ClassBody = { style?: Record<string, string | null>; classes?: { add?: string[]; remove?: string[] } };

function VariantPicker({ groups, group, value, onProp, onValue }: { groups: VariantGroup[]; group: VariantGroup; value: string; onProp: (prop: string) => void; onValue: (value: string) => void }) {
  return (
    <div className="ins-grid">
      <div className="ins-field select">
        <UiSelect className="ins-select" aria-label="Variant prop" value={group.prop} options={groups.map((entry) => ({ value: entry.prop, label: entry.prop }))} onChange={onProp} />
      </div>
      <div className="ins-field select">
        <UiSelect className="ins-select" aria-label="Variant value" value={value} options={group.options.map((entry) => ({ value: entry.value, label: entry.value }))} onChange={onValue} />
      </div>
    </div>
  );
}

function ClassChips({ label, classes, editable, onRemove }: { label: string; classes: string[]; editable: boolean; onRemove: (name: string) => void }) {
  return (
    <div className="prp-classes" aria-label={label}>
      {classes.map((name) => (
        <span key={name} className="prp-class">
          <code>{name}</code>
          {editable && (
            <button type="button" className="prp-class-x" aria-label={`Remove ${name}`} onClick={() => onRemove(name)}>
              ×
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

function ClassEditors({ send }: { send: (body: ClassBody) => void }) {
  const [adding, setAdding] = useState('');
  return (
    <>
      <div className="ins-grid">
        {PADDING.map((entry) => (
          <PxField key={entry.label} label={entry.label} onCommit={(px) => send({ style: Object.fromEntries(entry.props.map((name) => [name, px === null ? null : `${px}px`])) })} />
        ))}
      </div>
      <div className="ins-field wide">
        <input
          className="ins-input mono"
          aria-label="Add class"
          placeholder="Add class, for example px-6"
          value={adding}
          spellCheck={false}
          onChange={(event) => setAdding(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || adding.trim() === '') return;
            send({ classes: { add: adding.trim().split(/\s+/) } });
            setAdding('');
          }}
        />
      </div>
    </>
  );
}

function initialValue(instance: ComponentInstance, group: VariantGroup | undefined): string {
  if (!group) return '';
  return String(instance.values[group.prop] ?? group.default ?? group.options[0]?.value ?? '');
}

function VariantStyles({ projectId, directionId, instance, onStatus }: { projectId: string; directionId: string; instance: ComponentInstance; onStatus: (status: Status) => void }) {
  const cva = instance.component?.cva;
  const groups = cva?.variants ?? [];
  const [prop, setProp] = useState(groups[0]?.prop ?? '');
  const group = groups.find((entry) => entry.prop === prop) ?? groups[0];
  const current = initialValue(instance, group);
  const [value, setValue] = useState(current);
  const option = group?.options.find((entry) => entry.value === value) ?? group?.options[0];
  useEffect(() => setValue(current), [current]);
  const component = instance.component;
  if (!cva || !group || !option || !component) return null;
  const send = (body: ClassBody) => {
    onStatus({ kind: 'saving' });
    propsApi
      .variantClasses(projectId, directionId, { file: component.file, cva: cva.name, prop: group.prop, value: option.value, ...body })
      .then((result) => onStatus({ kind: 'saved', text: result.note ?? `${group.prop} ${option.value}: ${result.classes.join(' ')}` }))
      .catch((error: unknown) => onStatus({ kind: 'error', text: messageOf(error) }));
  };
  const uses = instance.uses > 1 ? ` (${instance.uses} uses in this project)` : '';
  return (
    <div className="prp-variant" aria-label="Variant styles">
      <p className="ins-note prp-warn" role="note">
        This changes every {component.name} with {group.prop} “{option.value}”{uses}.
      </p>
      <VariantPicker groups={groups} group={group} value={option.value} onProp={setProp} onValue={setValue} />
      <ClassChips label={`${group.prop} ${option.value} classes`} classes={option.classes.split(/\s+/).filter(Boolean)} editable={option.editable} onRemove={(name) => send({ classes: { remove: [name] } })} />
      {option.editable ? <ClassEditors send={send} /> : <p className="ins-note">These classes are not a plain string, so they are not edited here.</p>}
    </div>
  );
}

function PxField({ label, onCommit }: { label: string; onCommit: (px: number | null) => void }) {
  const [text, setText] = useState('');
  const commit = () => {
    const trimmed = text.trim();
    if (trimmed === '') return;
    const px = Number(trimmed.replace(/px$/, ''));
    if (Number.isFinite(px) && px >= 0) onCommit(px);
    setText('');
  };
  return (
    <div className="ins-field">
      <span className="ins-scrub static">{label === 'Padding X' ? 'X' : 'Y'}</span>
      <input className="ins-input" aria-label={label} placeholder={label} value={text} inputMode="numeric" onChange={(event) => setText(event.target.value)} onBlur={commit} onKeyDown={(event) => event.key === 'Enter' && commit()} />
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === 'idle') return null;
  if (status.kind === 'saving') return <p className="ins-note prp-status">Saving…</p>;
  return (
    <p className={`ins-note prp-status${status.kind === 'error' ? ' error' : ''}`} role={status.kind === 'error' ? 'alert' : 'status'}>
      {status.text}
    </p>
  );
}

export default function InspectorProps({ projectId, directionId, selection, editable }: InspectorPropsProps) {
  const { instance, setInstance } = useInstance(projectId, directionId, selection);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [styles, setStyles] = useState(false);
  const component = instance?.component;
  if (!instance || !component || !directionId) return null;
  const onChange = (name: string, value: PropValue | null) => {
    setStatus({ kind: 'saving' });
    setInstance({ ...instance, values: value === null ? Object.fromEntries(Object.entries(instance.values).filter(([key]) => key !== name)) : { ...instance.values, [name]: value } });
    propsApi
      .setProps(projectId, directionId, instance.use, { [name]: value })
      .then((result) => {
        if (result.instance) setInstance(result.instance);
        setStatus(result.version && (result.changed.length > 0 || result.removed.length > 0) ? { kind: 'saved', text: result.version.title } : { kind: 'idle' });
      })
      .catch((error: unknown) => setStatus({ kind: 'error', text: messageOf(error) }));
  };
  const disabled = !editable || status.kind === 'saving';
  const chip = (
    <span className="prp-chip" data-tip={`${component.file}:${component.line}`} data-tip-align="end">
      {component.name}
    </span>
  );
  return (
    <InspectorSection title="Component" className="prp" aside={chip}>
      <p className="prp-where">
        Used at {instance.use.file}:{instance.use.line}
      </p>
      {component.file.startsWith('packages/') && (
        <div className="prp-kit" data-testid="kit-preview">
          <ComponentPreviewThumb projectId={projectId} directionId={directionId} id={`${component.file}#${component.name}`} version="0" active className="prp-kit-thumb" />
          <p className="prp-where" data-tip={`${component.file}:${component.line}`}>
            Kit component, default props
          </p>
        </div>
      )}
      {component.props.length === 0 && <p className="ins-note">No props to edit here.</p>}
      <div className="prp-rows">
        {component.props.map((spec) => (
          <PropRow key={spec.name} instance={instance} spec={spec} disabled={disabled} onChange={onChange} />
        ))}
      </div>
      {instance.spread && <p className="ins-note">This element also spreads props, so a value there can win.</p>}
      {component.note && <p className="ins-note">{component.note}</p>}
      <StatusLine status={status} />
      {component.cva && editable && (
        <button type="button" className="btn small prp-styles-btn" aria-expanded={styles} onClick={() => setStyles((open) => !open)}>
          {styles ? 'Hide variant styles' : 'Edit variant styles'}
        </button>
      )}
      {styles && <VariantStyles projectId={projectId} directionId={directionId} instance={instance} onStatus={setStatus} />}
    </InspectorSection>
  );
}
