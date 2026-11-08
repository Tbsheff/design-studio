import { useEffect } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SkillsBody } from "./skills-body.js";
import { NO_SKILLS_TEXT, useSkillCatalog } from "./skills-model.js";

interface SkillsChecklistProps {
  readonly allowBash: boolean;
  readonly disabled: string[];
  readonly onChange: (next: string[]) => void;
}

const SkillsChecklist = ({
  disabled,
  allowBash,
  onChange,
}: SkillsChecklistProps): ReactElement => {
  const { catalog, error, reload } = useSkillCatalog();

  useEffect(reload, [reload]);

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
        <SkillsBody
          catalog={catalog}
          disabled={disabled}
          allowBash={allowBash}
          onChange={onChange}
        />
      )}
    </fieldset>
  );
};

export { SkillsChecklist };
