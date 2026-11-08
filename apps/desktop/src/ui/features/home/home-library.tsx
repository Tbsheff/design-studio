import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { FilterChip } from "./filter-chip.js";
import type { HomeFilter } from "./home-prefs-model.js";
import { FILTERS } from "./library-model.js";

const FilterChips = ({
  filter,
}: {
  readonly filter: HomeFilter;
}): ReactElement => (
  <div className="home-seg" role="tablist" aria-label={copy.show}>
    {FILTERS.map((item) => (
      <FilterChip key={item.id} item={item} isOn={filter === item.id} />
    ))}
  </div>
);

export { FilterChips };
