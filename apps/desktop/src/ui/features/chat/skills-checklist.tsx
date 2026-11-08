import type { SkillInfo } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { NO_SKILLS_TEXT, plural, useSkillCatalog } from "./skills-model.js";

interface Props {
  disabled: string[];
  allowBash: boolean;
  onChange: (next: string[]) => void;
}

const groupByOrigin = (skills: SkillInfo[]): [string, SkillInfo[]][] => {
  const groups = new Map<string, SkillInfo[]>();

  for (const skill of skills) {
    groups.set(skill.origin, [...(groups.get(skill.origin) ?? []), skill]);
  }

  return [...groups.entries()];
};

const originLabel = (origin: string): string => {
  if (origin === "personal") {
    return "Personal skills (~/.claude/skills)";
  }
  return `Plugin ${origin.slice("plugin:".length)}`;
};

const matches = (skill: SkillInfo, query: string): boolean => {
  const needle = query.trim().toLowerCase();

  return (
    needle === "" ||
    skill.id.toLowerCase().includes(needle) ||
    skill.description.toLowerCase().includes(needle)
  );
};

const SkillRow = ({
  skill,
  on,
  allowBash,
  onToggle,
}: {
  skill: SkillInfo;
  on: boolean;
  allowBash: boolean;
  onToggle: (on: boolean) => void;
}): ReactElement => (
  <label className="check skill-row" data-tip={skill.sourcePath}>
    <input
      type="checkbox"
      aria-label={`Skill ${skill.id}`}
      checked={on}
      onChange={(event) => onToggle(event.target.checked)}
    />
    <span className="skill-text">
      <span className="skill-name">
        {skill.name}
        {skill.needsBash && !allowBash && (
          <span className="skill-tag" data-tip={copy.thisSkillRuns}>
            {copy.needsShell}
          </span>
        )}
        {!skill.modelInvocable && (
          <span
            className="skill-tag muted-tag"
            data-tip-align="end"
            data-tip={copy.skillMdSets}
          >
            {copy.manualOnly}
          </span>
        )}
      </span>
      <span className="skill-desc">{skill.description}</span>
    </span>
  </label>
);

const SkillsChecklist = ({
  disabled,
  allowBash,
  onChange,
}: Props): ReactElement => {
  const { catalog, error, reload } = useSkillCatalog();
  const [query, setQuery] = useState("");

  useEffect(reload, []);

  const skills = catalog?.skills ?? [];

  const groups = useMemo(
    () => groupByOrigin(skills.filter((skill) => matches(skill, query))),
    [skills, query]
  );

  const onCount = skills.filter((skill) => !disabled.includes(skill.id)).length;

  const bashCount = skills.filter(
    (skill) => skill.needsBash && !disabled.includes(skill.id)
  ).length;

  const toggle = (id: string, on: boolean): void => {
    const rest = disabled.filter((item) => item !== id);
    onChange(on ? rest : [...rest, id]);
  };

  const setAll = (on: boolean): void =>
    onChange(on ? [] : skills.map((skill) => skill.id));

  return (
    <fieldset className="skills-field">
      <legend>{copy.claudeSkills}</legend>
      {error && (
        <p className="skills-note" role="alert">
          {copy.couldNotLoadSkills}{" "}
          <button type="button" className="link" onClick={reload}>
            {copy.tryAgain}
          </button>
        </p>
      )}
      {!error && !catalog && (
        <p className="skills-note">{copy.loadingSkills}</p>
      )}
      {catalog && catalog.skills.length === 0 && (
        <p className="skills-note" data-testid="skills-empty">
          {NO_SKILLS_TEXT}
        </p>
      )}
      {catalog && catalog.skills.length > 0 && (
        <>
          <div className="skills-bar">
            <span className="skills-note" aria-live="polite">
              {onCount}
              {copy.of}
              {skills.length}
              {copy.on}
            </span>
            <input
              aria-label={copy.filterSkills}
              type="search"
              placeholder={copy.filter}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              type="button"
              className="btn small ghost"
              onClick={() => setAll(true)}
            >
              {copy.allOn}
            </button>
            <button
              type="button"
              className="btn small ghost"
              onClick={() => setAll(false)}
            >
              {copy.allOff}
            </button>
          </div>
          <div className="skills-list">
            {groups.map(([origin, items]) => (
              <div
                key={origin}
                className="skills-group"
                role="group"
                aria-label={originLabel(origin)}
              >
                <span className="skills-group-head">{originLabel(origin)}</span>
                {items.map((skill) => (
                  <SkillRow
                    key={skill.id}
                    skill={skill}
                    on={!disabled.includes(skill.id)}
                    allowBash={allowBash}
                    onToggle={(on) => toggle(skill.id, on)}
                  />
                ))}
              </div>
            ))}
            {groups.length === 0 && (
              <p className="skills-note">{copy.noSkillsMatch}</p>
            )}
          </div>
          {!allowBash && bashCount > 0 && (
            <p className="skills-note">
              {plural(bashCount, "skill")}
              {copy.that} {bashCount === 1 && "is on needs"}
              {bashCount !== 1 && "are on need"}
              {copy.shellCommandsToLet}
              {bashCount === 1 && "it"}
              {bashCount !== 1 && "them"}
              {copy.runScriptsTurnOn}
            </p>
          )}
          {catalog.problems.length > 0 && (
            <details className="skills-problems">
              <summary>
                <Icon name="chevronRight" size={12} />
                {plural(catalog.problems.length, "folder")}
                {copy.didNotLoad}
              </summary>
              <ul>
                {catalog.problems.map((problem) => (
                  <li key={problem.source}>
                    <span className="mono">{problem.source}</span>
                    {copy.text10} {problem.reason}
                  </li>
                ))}
              </ul>
              <p className="skills-note">{copy.fixOrRemoveThe}</p>
            </details>
          )}
          <p className="skills-note">{copy.skillsComeFromClaude}</p>
        </>
      )}
    </fieldset>
  );
};

export { SkillsChecklist };
