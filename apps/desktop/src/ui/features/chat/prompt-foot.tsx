import { Disclosure } from "@design-studio/ui";
import { createElement } from "react";
import type { ReactElement } from "react";

import type { PromptBoxProps } from "./prompt-box-props.js";
import { PromptFootTrail } from "./prompt-foot-trail.js";
import { SkillsIndicator } from "./skills-indicator.js";

const PromptFoot = ({ box }: { box: PromptBoxProps }): ReactElement => {
  const { onSettingsSaved } = box;

  return (
    <>
      {createElement(Disclosure, {
        className: "prompt-foot",
        lead: (
          <SkillsIndicator
            projectId={box.projectId}
            settings={box.settings}
            onSaved={onSettingsSaved}
          />
        ),
        trail: (
          <PromptFootTrail
            contextTokens={box.contextTokens ?? null}
            model={box.model}
            onSettingsSaved={onSettingsSaved}
            projectId={box.projectId}
            settings={box.settings}
          />
        ),
      })}
    </>
  );
};

export { PromptFoot };
