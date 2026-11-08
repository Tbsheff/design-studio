import type { Project, ProjectSettings } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback, useState } from "react";
import type { MouseEvent, ReactElement } from "react";

import { toPlural } from "./plural-model.js";
import { toSkillsTip } from "./skill-picker-model.js";
import { SkillsIndicatorPop } from "./skills-indicator-pop.js";
import { enabledSkills, useSkillCatalog } from "./skills-model.js";
import { useSkillSave } from "./use-skill-save.js";

const BOOK_ICON_SIZE = 12;

const stopMouseDown = (event: MouseEvent): void => event.stopPropagation();

const SkillsIndicator = ({
  projectId,
  settings,
  onSaved,
}: {
  projectId: string;
  settings: ProjectSettings;
  onSaved: (project: Project) => void;
}): ReactElement => {
  const [open, setOpen] = useState(false);
  const { catalog } = useSkillCatalog();

  const { change, disabled, error } = useSkillSave(
    projectId,
    settings,
    onSaved
  );

  const count = enabledSkills(catalog, disabled).length;
  const toggle = useCallback(() => setOpen((wasOpen) => !wasOpen), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <span className="skills-ind-wrap">
      <button
        type="button"
        className="skills-ind"
        data-testid="skills-indicator"
        aria-expanded={open}
        data-tip-side="top"
        data-tip={toSkillsTip(catalog, disabled)}
        onMouseDown={stopMouseDown}
        onClick={toggle}
      >
        <Icon name="book" size={BOOK_ICON_SIZE} />
        {catalog && `${count} skill${toPlural(count)}`}
        {!catalog && "Skills"}
      </button>
      {open && (
        <SkillsIndicatorPop
          disabled={disabled}
          allowBash={settings.allowBash}
          error={error}
          onChange={change}
          onClose={close}
        />
      )}
    </span>
  );
};

export { SkillsIndicator };
