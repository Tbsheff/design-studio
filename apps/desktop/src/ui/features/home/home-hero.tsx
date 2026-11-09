import { useCallback } from "react";
import type { ReactElement } from "react";

import { HeroNotes } from "./hero-notes.js";
import { HomeCard } from "./home-card.js";
import { HomeExtrasSlot } from "./home-extras-slot.js";
import type { HomeScreen } from "./use-home-screen.js";

const HomeHero = ({
  screen,
}: {
  readonly screen: HomeScreen;
}): ReactElement => {
  const { base, composer } = screen;
  const { setFormError } = base;

  const clearError = useCallback((): void => {
    setFormError(null);
  }, [setFormError]);

  return (
    <section className="home-hero">
      <HomeCard screen={screen} />
      <HeroNotes
        isWindowDragged={composer.root.isWindowDragged}
        formError={base.formError}
        onClearError={clearError}
      />
      <HomeExtrasSlot screen={screen} />
    </section>
  );
};

export { HomeHero };
