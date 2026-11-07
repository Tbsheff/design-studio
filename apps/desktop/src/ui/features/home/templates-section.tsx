import type { Starter } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";

import { homePrefs } from "./home-prefs-model.js";
import type { HomeTemplate } from "./home-templates.js";
import type { TemplatesModule } from "./lazy-parts.js";

function TemplatesSection({
  templates,
  selected,
  isDisabled,
  onPick,
}: {
  readonly templates: TemplatesModule | null;
  readonly selected: string | null;
  readonly isDisabled: boolean;
  readonly onPick: (template: HomeTemplate, starter: Starter | null) => void;
}) {
  return (
    <section className="home-templates" aria-label="Templates and starters">
      <button
        type="button"
        className="ui-section-label home-templates-toggle"
        aria-expanded
        onClick={() => homePrefs.set({ hasTemplatesShown: false })}
      >
        Templates and starters
        <Icon name="close" size={10} />
      </button>
      {templates ? (
        <templates.HomeTemplateGrid
          selected={selected}
          isDisabled={isDisabled}
          onPick={onPick}
        />
      ) : (
        <div className="home-tile-placeholder" aria-hidden="true" />
      )}
    </section>
  );
}

export { TemplatesSection };
