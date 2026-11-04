import type { Starter } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";

import { homePrefs } from "./home-prefs-model.js";
import type { HomeTemplate } from "./home-templates.js";
import type { TemplatesModule } from "./lazy-parts.js";

function TemplatesSection({
  templates,
  selected,
  disabled,
  onPick,
}: {
  templates: TemplatesModule | null;
  selected: string | null;
  disabled: boolean;
  onPick: (template: HomeTemplate, starter: Starter | null) => void;
}) {
  return (
    <section className="home-templates" aria-label="Templates and starters">
      <button
        type="button"
        className="ui-section-label home-templates-toggle"
        aria-expanded
        onClick={() => homePrefs.set({ templatesShown: false })}
      >
        Templates and starters
        <Icon name="close" size={10} />
      </button>
      {templates ? (
        <templates.HomeTemplateGrid
          selected={selected}
          disabled={disabled}
          onPick={onPick}
        />
      ) : (
        <div className="home-tile-placeholder" aria-hidden="true" />
      )}
    </section>
  );
}

export { TemplatesSection };
