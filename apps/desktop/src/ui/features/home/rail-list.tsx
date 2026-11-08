import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ProjectHit } from "./deps.js";
import { toEmptyText, toRailSections } from "./rail-model.js";
import { RailRow } from "./rail-row.js";

interface RailListProps {
  readonly shown: readonly ProjectHit[];
  readonly projectId: string;
  readonly filter: string;
}

const RailList = ({
  shown,
  projectId,
  filter,
}: RailListProps): ReactElement => (
  <nav className="prail-list" aria-label={copy.projects}>
    {toRailSections(shown).map((section) => (
      <fieldset
        key={section.title}
        className="prail-group"
        aria-label={section.title}
      >
        <div className="prail-group-head">{section.title}</div>
        {section.items.map((hit) => (
          <RailRow key={hit.id} hit={hit} isCurrent={hit.id === projectId} />
        ))}
      </fieldset>
    ))}
    {shown.length === 0 && <p className="prail-empty">{toEmptyText(filter)}</p>}
  </nav>
);

export { RailList };
