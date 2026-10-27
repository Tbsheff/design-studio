import { useEffect, useMemo, useState } from 'react';
import type { SkillInfo } from '../../shared/contracts';
import { NO_SKILLS_TEXT, plural, useSkillCatalog } from '../skills';

interface Props {
  disabled: string[];
  allowBash: boolean;
  onChange: (next: string[]) => void;
}

function groupByOrigin(skills: SkillInfo[]): [string, SkillInfo[]][] {
  const groups = new Map<string, SkillInfo[]>();
  for (const skill of skills) groups.set(skill.origin, [...(groups.get(skill.origin) ?? []), skill]);
  return [...groups.entries()];
}

function originLabel(origin: string): string {
  return origin === 'personal' ? 'Personal skills (~/.claude/skills)' : `Plugin ${origin.slice('plugin:'.length)}`;
}

function matches(skill: SkillInfo, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle === '' || skill.id.toLowerCase().includes(needle) || skill.description.toLowerCase().includes(needle);
}

function SkillRow({ skill, on, allowBash, onToggle }: { skill: SkillInfo; on: boolean; allowBash: boolean; onToggle: (on: boolean) => void }) {
  return (
    <label className="check skill-row" title={skill.sourcePath}>
      <input type="checkbox" aria-label={`Skill ${skill.id}`} checked={on} onChange={(e) => onToggle(e.target.checked)} />
      <span className="skill-text">
        <span className="skill-name">
          {skill.name}
          {skill.needsBash && !allowBash && <span className="skill-tag" data-tip="This skill runs terminal commands. Turn on shell commands in project settings to use it fully.">Needs shell</span>}
          {!skill.modelInvocable && (
            <span className="skill-tag muted-tag" data-tip-align="end" data-tip="SKILL.md sets disable-model-invocation, so the agent cannot load it">
              Manual only
            </span>
          )}
        </span>
        <span className="skill-desc">{skill.description}</span>
      </span>
    </label>
  );
}

export function SkillsChecklist({ disabled, allowBash, onChange }: Props) {
  const { catalog, error, reload } = useSkillCatalog();
  const [query, setQuery] = useState('');

  useEffect(reload, []);

  const skills = catalog?.skills ?? [];
  const groups = useMemo(() => groupByOrigin(skills.filter((skill) => matches(skill, query))), [skills, query]);
  const onCount = skills.filter((skill) => !disabled.includes(skill.id)).length;
  const bashCount = skills.filter((skill) => skill.needsBash && !disabled.includes(skill.id)).length;

  const toggle = (id: string, on: boolean) => {
    const rest = disabled.filter((item) => item !== id);
    onChange(on ? rest : [...rest, id]);
  };
  const setAll = (on: boolean) => onChange(on ? [] : skills.map((skill) => skill.id));

  return (
    <fieldset className="skills-field">
      <legend>Claude skills</legend>
      {error && (
        <p className="skills-note" role="alert">
          Could not load skills. Check your connection, then try again.{' '}
          <button type="button" className="link" onClick={reload}>
            Try again
          </button>
        </p>
      )}
      {!error && !catalog && <p className="skills-note">Loading skills…</p>}
      {catalog && catalog.skills.length === 0 && (
        <p className="skills-note" data-testid="skills-empty">
          {NO_SKILLS_TEXT}
        </p>
      )}
      {catalog && catalog.skills.length > 0 && (
        <>
          <div className="skills-bar">
            <span className="skills-note" aria-live="polite">
              {onCount} of {skills.length} on
            </span>
            <input aria-label="Filter skills" type="search" placeholder="Filter" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button type="button" className="btn small ghost" onClick={() => setAll(true)}>
              All on
            </button>
            <button type="button" className="btn small ghost" onClick={() => setAll(false)}>
              All off
            </button>
          </div>
          <div className="skills-list">
            {groups.map(([origin, items]) => (
              <div key={origin} className="skills-group" role="group" aria-label={originLabel(origin)}>
                <span className="skills-group-head">{originLabel(origin)}</span>
                {items.map((skill) => (
                  <SkillRow key={skill.id} skill={skill} on={!disabled.includes(skill.id)} allowBash={allowBash} onToggle={(on) => toggle(skill.id, on)} />
                ))}
              </div>
            ))}
            {groups.length === 0 && <p className="skills-note">No skills match.</p>}
          </div>
          {!allowBash && bashCount > 0 && (
            <p className="skills-note">
              {plural(bashCount, 'skill')} that {bashCount === 1 ? 'is on needs' : 'are on need'} shell commands. To let {bashCount === 1 ? 'it' : 'them'} run scripts, turn on "Allow agent to run shell commands".
            </p>
          )}
          {catalog.problems.length > 0 && (
            <details className="skills-problems">
              <summary>{plural(catalog.problems.length, 'folder')} did not load</summary>
              <ul>
                {catalog.problems.map((problem) => (
                  <li key={problem.source}>
                    <span className="mono">{problem.source}</span>: {problem.reason}
                  </li>
                ))}
              </ul>
              <p className="skills-note">Fix or remove the SKILL.md in that folder, then open this list again.</p>
            </details>
          )}
          <p className="skills-note">
            Skills come from ~/.claude/skills and your enabled Claude Code plugins. The agent can read the files in a skill folder that is on, and their text goes to the model.
          </p>
        </>
      )}
    </fieldset>
  );
}
