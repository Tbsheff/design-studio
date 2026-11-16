import type { ReactElement } from "react";

import { HomeClarify } from "./home-clarify.js";
import { HomeComposer } from "./home-composer.js";
import type { HomeScreen } from "./use-home-screen.js";

const HomeCard = ({
  screen,
}: {
  readonly screen: HomeScreen;
}): ReactElement => {
  const { composer, draft } = screen;
  const hasChip = composer.flow.app.chip !== null;
  const isAsking = draft.questions !== null;

  return (
    <div className="home-card">
      <HomeComposer screen={screen} />
      {isAsking && !hasChip && <HomeClarify screen={screen} />}
    </div>
  );
};

export { HomeCard };
