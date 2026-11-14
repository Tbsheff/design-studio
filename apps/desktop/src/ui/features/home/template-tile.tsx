import type { Starter } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { HomeTemplate } from "./home-template-model.js";
import { toTemplateArt } from "./template-art.js";

const TemplateTile = ({
  template,
  isSelected,
  isDisabled,
  starters,
  onPick,
}: {
  readonly template: HomeTemplate;
  readonly isSelected: boolean;
  readonly isDisabled: boolean;
  readonly starters: readonly Starter[] | null;
  readonly onPick: (template: HomeTemplate, starter: Starter | null) => void;
}): ReactElement => {
  const pick = useCallback((): void => {
    const starter = starters?.find(
      (candidate) => candidate.id === template.starterId
    );

    onPick(template, starter ?? null);
  }, [onPick, starters, template]);

  return (
    <button
      type="button"
      className="ui-tile"
      aria-pressed={isSelected}
      disabled={isDisabled}
      data-template={template.id}
      onClick={pick}
    >
      <span className="ui-tile-art">{toTemplateArt(template.id)}</span>
      {template.label}
    </button>
  );
};

export { TemplateTile };
