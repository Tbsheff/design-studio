import type { HomeFilter } from "./home-prefs-model.js";
import type { ListFilter } from "./project-card-model.js";

const SYSTEMS_EMPTY =
  "Your design systems show here. Start from one below, or make a new one.";

const toGridFilter = (
  filter: HomeFilter,
  labels: Record<HomeFilter, string>,
  onClear: () => void
): ListFilter | null => {
  if (filter === "all") {
    return null;
  }

  if (filter === "systems") {
    return { empty: SYSTEMS_EMPTY, label: labels[filter], onClear };
  }

  return { label: labels[filter], onClear };
};

export { toGridFilter };
