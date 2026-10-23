import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import type { Project, ProjectSettings, SkillInfo } from '../../shared/contracts';
import { api, errorText } from '../api';
import { NO_SKILLS_TEXT, enabledSkills, originText, plural, skillDisplayName, useSkillCatalog } from '../skills';
import { Icon } from './Icon';
import { SkillsChecklist } from './SkillsChecklist';

function matches(skill: SkillInfo, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle === '' || skill.id.toLowerCase().includes(needle) || skill.description.toLowerCase().includes(needle);
}

function useDismiss(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);
  return ref;
}

const POP_GAP = 8;

function useFitAbove(ref: RefObject<HTMLDivElement | null>, max: number) {
  useLayoutEffect(() => {
    const fit = () => {
      const pop = ref.current;
      const anchor = pop?.parentElement;
      if (!pop || !anchor) return;
      const bounds = pop.closest('aside')?.getBoundingClientRect() ?? { top: 0 };
      const room = anchor.getBoundingClientRect().top - Math.max(0, bounds.top) - POP_GAP;
      pop.style.maxHeight = `${Math.max(120, Math.min(max, room))}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [ref, max]);
}

function SkillOption({ skill, active, onPick }: { skill: SkillInfo; active: boolean; onPick: () => void }) {
  return (
    <li
      id={`skill-opt-${skill.id}`}
      role="option"
      aria-selected={active}
      className={`skill-opt ${active ? 'active' : ''}`}
      title={skill.sourcePath}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
    >
      <span className="skill-opt-head">
        <Icon name="book" size={13} />
        <strong>{skill.name}</strong>
        <span className="skill-origin">{originText(skill.origin)}</span>
        {skill.needsBash && <span className="skill-tag">Needs shell</span>}
      </span>
      <span className="skill-opt-desc">{skill.description}</span>
    </li>
  );
}

function nextIndex(key: string, index: number, count: number): number {
  if (count === 0) return 0;
  if (key === 'ArrowDown') return (index + 1) % count;
  if (key === 'ArrowUp') return (index - 1 + count) % count;
  return index;
}

interface PickerProps {
  disabled: readonly string[];
  exclude: readonly string[];
  onPick: (id: string) => void;
  onClose: () => void;
}

export function SkillPicker({ disabled, exclude, onPick, onClose }: PickerProps) {
  const { catalog, error } = useSkillCatalog();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const ref = useDismiss(onClose);
  const all = enabledSkills(catalog, disabled).filter((skill) => skill.modelInvocable && !exclude.includes(skill.id));
  const shown = all.filter((skill) => matches(skill, query));
  const current = shown[Math.min(active, Math.max(0, shown.length - 1))];
  const manualCount = enabledSkills(catalog, disabled).filter((skill) => !skill.modelInvocable).length;
  useFitAbove(ref, 420);
  useEffect(() => {
    if (current) document.getElementById(`skill-opt-${current.id}`)?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (current) onPick(current.id);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((index) => nextIndex(e.key, index, shown.length));
    }
  };

  return (
    <div ref={ref} className="skill-pop" role="dialog" aria-label="Pick a skill">
      <input
        autoFocus
        className="skill-search"
        aria-label="Search skills"
        role="combobox"
        aria-expanded="true"
        aria-controls="skill-options"
        aria-activedescendant={current ? `skill-opt-${current.id}` : undefined}
        placeholder="Search skills"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKey}
      />
      <PickerBody catalogLoaded={Boolean(catalog)} error={error} total={catalog?.skills.length ?? 0} enabled={all.length}>
        <ul id="skill-options" role="listbox" aria-label="Skills" className="skill-opts">
          {shown.map((skill) => (
            <SkillOption key={skill.id} skill={skill} active={skill === current} onPick={() => onPick(skill.id)} />
          ))}
          {shown.length === 0 && <li className="skill-empty">No skills match.</li>}
        </ul>
      </PickerBody>
      <p className="skill-pop-foot">
        ↑ ↓ to move, Enter to add, Esc to close
        {manualCount > 0 && (
          <span className="skill-pop-manual" title="These skills set disable-model-invocation in SKILL.md, so the agent cannot load them. Run them yourself in Claude Code.">
            {' · '}
            {plural(manualCount, 'manual-only skill')} not listed
          </span>
        )}
      </p>
    </div>
  );
}

function PickerBody(props: { catalogLoaded: boolean; error: string | null; total: number; enabled: number; children: ReactNode }) {
  if (props.error) return <p className="skill-empty">Could not load skills ({props.error}). Close this list and open it again to retry.</p>;
  if (!props.catalogLoaded) return <p className="skill-empty">Loading skills…</p>;
  if (props.total === 0) return <p className="skill-empty" data-testid="skills-empty">{NO_SKILLS_TEXT}</p>;
  if (props.enabled === 0) return <p className="skill-empty">All skills are off for this project. Turn some on with the skills count below.</p>;
  return <>{props.children}</>;
}

export function SkillChips({ ids, onRemove }: { ids: string[]; onRemove: (id: string) => void }) {
  if (ids.length === 0) return null;
  return (
    <div className="skill-chips" aria-label="Skills for this message">
      {ids.map((id) => (
        <span key={id} className="skill-chip" title={`The agent will use the ${id} skill`}>
          <Icon name="book" size={12} />
          {skillDisplayName(id)}
          <button type="button" aria-label={`Remove skill ${id}`} onClick={() => onRemove(id)}>
            <Icon name="close" size={11} />
          </button>
        </span>
      ))}
    </div>
  );
}

interface IndicatorProps {
  projectId: string;
  settings: ProjectSettings;
  onSaved: (project: Project) => void;
}

export function SkillsIndicator({ projectId, settings, onSaved }: IndicatorProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { catalog } = useSkillCatalog();
  const [pending, setPending] = useState<string[] | null>(null);
  const disabled = pending ?? settings.disabledSkills ?? [];
  const count = enabledSkills(catalog, disabled).length;
  const save = (next: string[]) => {
    setPending(next);
    return api.updateSettings(projectId, { disabledSkills: next }).then(
      (project) => {
        setError(null);
        onSaved(project);
        setPending((current) => (current === next ? null : current));
      },
      (err: unknown) => {
        setError(errorText(err));
        setPending(null);
      },
    );
  };
  return (
    <span className="skills-ind-wrap">
      <button
        type="button"
        className="skills-ind"
        data-testid="skills-indicator"
        aria-expanded={open}
        title={catalog ? `${plural(count, 'skill')} on for this project, ${plural(enabledSkills(catalog, disabled).filter((skill) => !skill.modelInvocable).length, 'manual-only skill')} the agent cannot load` : 'Claude skills for this project'}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => setOpen((x) => !x)}
      >
        <Icon name="book" size={12} />
        {catalog ? `${count} skill${count === 1 ? '' : 's'}` : 'Skills'}
      </button>
      {open && <IndicatorPop disabled={disabled} allowBash={settings.allowBash} error={error} onChange={(next) => void save(next)} onClose={() => setOpen(false)} />}
    </span>
  );
}

function IndicatorPop(props: { disabled: string[]; allowBash: boolean; error: string | null; onChange: (next: string[]) => void; onClose: () => void }) {
  const ref = useDismiss(props.onClose);
  useFitAbove(ref, 520);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && props.onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props]);
  return (
    <div ref={ref} className="skill-pop skills-ind-pop settings-fields" role="dialog" aria-label="Skills for this project">
      <SkillsChecklist disabled={props.disabled} allowBash={props.allowBash} onChange={props.onChange} />
      {props.error && (
        <div className="alert error" role="alert">
          {props.error}
        </div>
      )}
    </div>
  );
}
