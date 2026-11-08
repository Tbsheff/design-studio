import type { Starter } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { homePrefs } from "./home-prefs-model.js";
import type { HomeTemplate } from "./home-template-model.js";
import type { TemplatesModule } from "./lazy-parts-model.js";

const setTemplatesHidden = (): void => {
  homePrefs.set({ hasTemplatesShown: false });
};

const TemplatesSection = ({
  templates,
  selected,
  isDisabled,
  onPick,
}: {
  readonly templates: TemplatesModule | null;
  readonly selected: string | null;
  readonly isDisabled: boolean;
  readonly onPick: (template: HomeTemplate, starter: Starter | null) => void;
}): ReactElement => (
  <section className="home-templates" aria-label={copy.templatesAndStarters}>
    <button
      type="button"
      className="ui-section-label home-templates-toggle"
      aria-expanded
      onClick={setTemplatesHidden}
    >
      {copy.templatesAndStarters}
      <Icon name="close" size={10} />
    </button>
    {templates && (
      <templates.HomeTemplateGrid
        selected={selected}
        isDisabled={isDisabled}
        onPick={onPick}
      />
    )}
    {!templates && <div className="home-tile-placeholder" aria-hidden="true" />}
  </section>
);

export { TemplatesSection };
