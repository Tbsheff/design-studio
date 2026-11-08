import { useHomePrefs } from "./home-prefs-model.js";

interface HomeView {
  readonly favorites: readonly string[];
  readonly isFavoritesOnly: boolean;
  readonly view: "list" | "grid";
}

const useHomeView = (): HomeView => {
  const prefs = useHomePrefs();

  return {
    favorites: prefs.favorites,
    isFavoritesOnly: prefs.isFavoritesOnly,
    view: prefs.view,
  };
};

export { useHomeView };

export type { HomeView };
