import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { homePrefs } from "./home-prefs-model.js";
import { Star } from "./star-icon.js";
import { useHomeView } from "./use-home-view.js";
import { ViewToggleButton } from "./view-toggle-button.js";

const ViewTools = (): ReactElement => {
  const { view, isFavoritesOnly } = useHomeView();

  const toggleFavorites = useCallback((): void => {
    homePrefs.set({ isFavoritesOnly: !isFavoritesOnly });
  }, [isFavoritesOnly]);

  return (
    <>
      <button
        type="button"
        className="icon-btn home-fav-filter"
        aria-pressed={isFavoritesOnly}
        aria-label={copy.showFavoritesOnly}
        data-tip={copy.favorites}
        onClick={toggleFavorites}
      >
        <Star isFilled={isFavoritesOnly} />
      </button>
      <fieldset className="ui-tools home-view-toggle" aria-label={copy.layout}>
        <ViewToggleButton
          view="list"
          current={view}
          label={copy.list}
          tipAlign={null}
        />
        <ViewToggleButton
          view="grid"
          current={view}
          label={copy.grid}
          tipAlign="end"
        />
      </fieldset>
    </>
  );
};

export { ViewTools };
