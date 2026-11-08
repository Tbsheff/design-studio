import type { ReactElement } from "react";

import { HomeClarify } from "./home-clarify.js";
import { HomeComposer } from "./home-composer.js";
import { TemplatesSection } from "./templates-section.js";
import type { HomeScreen } from "./use-home-screen.js";

const HomeCard = ({
  screen,
}: {
  readonly screen: HomeScreen;
}): ReactElement => {
  const { base, composer, draft, modules, ui } = screen;
  const { pickTemplate } = draft;
  const hasChip = composer.flow.app.chip !== null;
  const isAsking = draft.questions !== null;

  return (
    <div className="home-card">
      <HomeComposer screen={screen} />
      {isAsking && !hasChip && <HomeClarify screen={screen} />}
      {!isAsking && ui.prefs.hasTemplatesShown && (
        <TemplatesSection
          templates={modules.templates}
          selected={draft.template?.id ?? null}
          isDisabled={base.busy !== null}
          onPick={pickTemplate}
        />
      )}
    </div>
  );
};

export { HomeCard };
