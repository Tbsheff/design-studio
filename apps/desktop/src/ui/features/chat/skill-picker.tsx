import type {
  SkillInfo,
  Project,
  ProjectSettings,
} from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { api, errorText } from "../../api.js";
import { rank } from "../../chat-slots.js";
import type { Command } from "../../chat-slots.js";
import { copy } from "./copy.js";
import { SkillsChecklist } from "./skills-checklist.js";
import {
  NO_SKILLS_TEXT,
  enabledSkills,
  originText,
  plural,
  useSkillCatalog,
  skillDisplayName,
} from "./skills-model.js";
import type { SlashChoice, SlashSection } from "./slash-menu.js";

const matches = (skill: SkillInfo, query: string): boolean => {
  const needle = query.trim().toLowerCase();

  return (
    needle === "" ||
    skill.id.toLowerCase().includes(needle) ||
    skill.description.toLowerCase().includes(needle)
  );
};

const shownCommands = (
  commands: readonly Command[],
  query: string
): Command[] => {
  const tokens = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);

  if (tokens.length === 0) {
    return [...commands].toSorted((left, right) =>
      (left.slash ?? "").localeCompare(right.slash ?? "")
    );
  }

  const hits = commands.filter((command) => {
    const words = (command.slash ?? "").toLowerCase().split(/[\s-]+/u);

    return tokens.every((token) =>
      words.some((word) => word.startsWith(token))
    );
  });

  return rank(hits, tokens.join(" "), (command) => ({
    title: command.slash ?? command.title,
  })).map((ranked) => ranked.item);
};

const commandChoice = (
  command: Command,
  onCommand: (command: Command) => void
): SlashChoice => ({
  disabledReason: command.disabled ?? null,
  hint: command.title,
  icon: command.icon ?? "sparkle",
  id: command.id,
  label: `/${command.slash ?? ""}`,
  pick: () => onCommand(command),
});

const skillChoice = (
  skill: SkillInfo,
  onPick: (id: string) => void
): SlashChoice => ({
  hint: skill.description,
  icon: "book",
  id: skill.id,
  label: skill.name,
  meta: originText(skill.origin),
  pick: () => onPick(skill.id),
  tag: skill.needsBash ? (
    <span className="skill-tag">{copy.needsShell}</span>
  ) : null,
  tip: `${skill.description}\n${skill.sourcePath}`,
});

const skillStatus = (
  catalog: { skills: readonly SkillInfo[] } | null,
  error: string | null,
  enabled: number
): string | null => {
  if (error) {
    return `Could not load skills (${error}). Type / again to retry.`;
  }

  if (!catalog) {
    return "Loading skills…";
  }

  if (catalog.skills.length === 0) {
    return NO_SKILLS_TEXT;
  }

  if (enabled === 0) {
    return "All skills are off for this project. Turn some on with the skills count below.";
  }

  return null;
};

interface SlashSourceProps {
  disabled: readonly string[];
  exclude: readonly string[];
  commands: readonly Command[];
  onSkill: (id: string) => void;
  onCommand: (command: Command) => void;
}

const useSlashSections = ({
  disabled,
  exclude,
  commands,
  onSkill,
  onCommand,
}: SlashSourceProps) => {
  const { catalog, error } = useSkillCatalog();
  const on = enabledSkills(catalog, disabled);

  const all = on.filter(
    (skill) => skill.modelInvocable && !exclude.includes(skill.id)
  );

  const manualCount = on.filter((skill) => !skill.modelInvocable).length;
  const status = skillStatus(catalog, error, all.length);

  const sections = (query: string): SlashSection[] => {
    const skills = all.filter((skill) => matches(skill, query));

    return [
      {
        items: shownCommands(commands, query).map((command) =>
          commandChoice(command, onCommand)
        ),
        label: "Commands",
      },
      {
        items: (query === ""
          ? [...skills].sort((left, right) =>
              left.name.localeCompare(right.name)
            )
          : skills
        ).map((skill) => skillChoice(skill, onSkill)),
        label: "Skills",
        status: query === "" ? status : null,
      },
    ];
  };

  const note =
    manualCount > 0 ? (
      <span data-tip-side="top" data-tip={copy.theseSkillsSet}>
        {plural(manualCount, "manual-only skill")}
        {copy.notListed}
      </span>
    ) : null;

  return { note, sections };
};

const useDismiss = (onClose: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", onDown);

    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  return ref;
};

const POP_GAP = 8;

const useFitAbove = (ref: RefObject<HTMLDivElement | null>, max: number) => {
  useLayoutEffect(() => {
    const fit = () => {
      const pop = ref.current;
      const anchor = pop?.parentElement;

      if (!pop || !anchor) {
        return;
      }

      const bounds = pop.closest("aside")?.getBoundingClientRect() ?? {
        top: 0,
      };

      const room =
        anchor.getBoundingClientRect().top - Math.max(0, bounds.top) - POP_GAP;

      pop.style.maxHeight = `${Math.max(120, Math.min(max, room))}px`;
    };

    fit();
    window.addEventListener("resize", fit);

    return () => window.removeEventListener("resize", fit);
  }, [ref, max]);
};

const SkillChips = ({
  ids,
  onRemove,
}: {
  ids: string[];
  onRemove: (id: string) => void;
}) => {
  if (ids.length === 0) {
    return null;
  }

  return (
    <div className="skill-chips" aria-label={copy.skillsForThis}>
      {ids.map((id) => (
        <span
          key={id}
          className="skill-chip"
          data-tip-side="top"
          data-tip={`The agent will use the ${id} skill`}
        >
          <Icon name="book" size={12} />
          {skillDisplayName(id)}
          <button
            type="button"
            aria-label={`Remove skill ${id}`}
            onClick={() => onRemove(id)}
          >
            <Icon name="close" size={11} />
          </button>
        </span>
      ))}
    </div>
  );
};

interface IndicatorProps {
  projectId: string;
  settings: ProjectSettings;
  onSaved: (project: Project) => void;
}

const IndicatorPop = (props: {
  disabled: string[];
  allowBash: boolean;
  error: string | null;
  onChange: (next: string[]) => void;
  onClose: () => void;
}) => {
  const ref = useDismiss(props.onClose);
  useFitAbove(ref, 520);
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) =>
      event.key === "Escape" && props.onClose();

    globalThis.addEventListener("keydown", onKey);

    return () => globalThis.removeEventListener("keydown", onKey);
  }, [props]);

  return (
    <div
      ref={ref}
      className="skill-pop skills-ind-pop settings-fields"
      role="dialog"
      aria-label={copy.skillsForThisProject}
    >
      <SkillsChecklist
        disabled={props.disabled}
        allowBash={props.allowBash}
        onChange={props.onChange}
      />
      {props.error && (
        <div className="alert error" role="alert">
          {props.error}
        </div>
      )}
    </div>
  );
};

const SkillsIndicator = ({ projectId, settings, onSaved }: IndicatorProps) => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { catalog } = useSkillCatalog();
  const [pending, setPending] = useState<string[] | null>(null);
  const disabled = pending ?? settings.disabledSkills ?? [];
  const count = enabledSkills(catalog, disabled).length;

  const save = async (next: string[]): Promise<void> => {
    setPending(next);

    try {
      const project = await api.updateSettings(projectId, {
        disabledSkills: next,
      });
      setError(null);
      onSaved(project);
      setPending((current) => (current === next ? null : current));
    } catch (thrownError: unknown) {
      setError(errorText(thrownError));
      setPending(null);
    }
  };

  return (
    <span className="skills-ind-wrap">
      <button
        type="button"
        className="skills-ind"
        data-testid="skills-indicator"
        aria-expanded={open}
        data-tip-side="top"
        data-tip={
          catalog
            ? `${plural(count, "skill")} on for this project, ${plural(enabledSkills(catalog, disabled).filter((skill) => !skill.modelInvocable).length, "manual-only skill")} the agent cannot load`
            : "Claude skills for this project"
        }
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <Icon name="book" size={12} />
        {catalog ? `${count} skill${count === 1 ? "" : "s"}` : "Skills"}
      </button>
      {open && (
        <IndicatorPop
          disabled={disabled}
          allowBash={settings.allowBash}
          error={error}
          onChange={(next) => void save(next)}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  );
};

export { SkillChips, SkillsIndicator, useSlashSections };
