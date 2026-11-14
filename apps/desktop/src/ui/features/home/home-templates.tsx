import type { Starter } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { HOME_TEMPLATES } from "./home-template-model.js";
import type { HomeTemplate } from "./home-template-model.js";
import { TemplateTile } from "./template-tile.js";
import { useStarterList } from "./use-starters.js";

const HomeTemplateGrid = ({
  selected,
  isDisabled,
  onPick,
}: {
  readonly selected: string | null;
  readonly isDisabled: boolean;
  readonly onPick: (template: HomeTemplate, starter: Starter | null) => void;
}): ReactElement => {
  const starters = useStarterList();

  return (
    <div
      className="ui-tile-grid home-tile-grid"
      role="group"
      aria-label={copy.templates}
    >
      {HOME_TEMPLATES.map((template) => (
        <TemplateTile
          key={template.id}
          template={template}
          isSelected={selected === template.id}
          isDisabled={isDisabled}
          starters={starters}
          onPick={onPick}
        />
      ))}
    </div>
  );
};

export { HomeTemplateGrid };
