import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { Project, ProjectSettings, SkillInfo } from '../../shared/contracts';
import { api, errorText } from '../api';
import { NO_SKILLS_TEXT, enabledSkills, originText, plural, skillDisplayName, useSkillCatalog } from '../skills';
import { Icon } from './Icon';
import { SkillsChecklist } from './SkillsChecklist';
import { rank } from '../commands/fuzzy';
import type { Command } from '../commands/registry';
import type { SlashChoice, SlashSection } from './SlashMenu';

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

function shownCommands(commands: readonly Command[], query: string): Command[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [...commands].sort((a, b) => (a.slash ?? '').localeCompare(b.slash ?? ''));
  const hits = commands.filter((c) => {
    const words = (c.slash ?? '').toLowerCase().split(/[\s-]+/);
    return tokens.every((t) => words.some((w) => w.startsWith(t)));
  });
  return rank(hits, tokens.join(' '), (c) => ({ title: c.slash ?? c.title })).map((r) => r.item);
}

function commandChoice(command: Command, onCommand: (command: Command) => void): SlashChoice {
  return { id: command.id, label: `/${command.slash ?? ''}`, icon: command.icon ?? 'sparkle', hint: command.title, disabledReason: command.disabled ?? null, pick: () => onCommand(command) };
}

function skillChoice(skill: SkillInfo, onPick: (id: string) => void): SlashChoice {
  return {
    id: skill.id,
    label: skill.name,
    icon: 'book',
    hint: skill.description,
    meta: originText(skill.origin),
    tip: `${skill.description}\n${skill.sourcePath}`,
    tag: skill.needsBash ? <span className="skill-tag">Needs shell</span> : null,
    pick: () => onPick(skill.id),
  };
}

function skillStatus(catalog: { skills: readonly SkillInfo[] } | null, error: string | null, enabled: number): string | null {
  if (error) return `Could not load skills (${error}). Type / again to retry.`;
  if (!catalog) return 'Loading skills…';
  if (catalog.skills.length === 0) return NO_SKILLS_TEXT;
  if (enabled === 0) return 'All skills are off for this project. Turn some on with the skills count below.';
  return null;
}

interface SlashSourceProps {
  disabled: readonly string[];
  exclude: readonly string[];
  commands: readonly Command[];
  onSkill: (id: string) => void;
  onCommand: (command: Command) => void;
}

export function useSlashSections({ disabled, exclude, commands, onSkill, onCommand }: SlashSourceProps) {
  const { catalog, error } = useSkillCatalog();
  const on = enabledSkills(catalog, disabled);
  const all = on.filter((skill) => skill.modelInvocable && !exclude.includes(skill.id));
  const manualCount = on.filter((skill) => !skill.modelInvocable).length;
  const status = skillStatus(catalog, error, all.length);
  const sections = (query: string): SlashSection[] => {
    const skills = all.filter((skill) => matches(skill, query));
    return [
      { label: 'Commands', items: shownCommands(commands, query).map((command) => commandChoice(command, onCommand)) },
      { label: 'Skills', items: (query === '' ? [...skills].sort((a, b) => a.name.localeCompare(b.name)) : skills).map((skill) => skillChoice(skill, onSkill)), status: query === '' ? status : null },
    ];
  };
  const note =
    manualCount > 0 ? (
      <span data-tip-side="top" data-tip="These skills set disable-model-invocation in SKILL.md, so the agent cannot load them. Run them yourself in Claude Code.">
        {plural(manualCount, 'manual-only skill')} not listed
      </span>
    ) : null;
  return { sections, note };
}

export function SkillChips({ ids, onRemove }: { ids: string[]; onRemove: (id: string) => void }) {
  if (ids.length === 0) return null;
  return (
    <div className="skill-chips" aria-label="Skills for this message">
      {ids.map((id) => (
        <span key={id} className="skill-chip" data-tip-side="top" data-tip={`The agent will use the ${id} skill`}>
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
        data-tip-side="top"
        data-tip={catalog ? `${plural(count, 'skill')} on for this project, ${plural(enabledSkills(catalog, disabled).filter((skill) => !skill.modelInvocable).length, 'manual-only skill')} the agent cannot load` : 'Claude skills for this project'}
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
