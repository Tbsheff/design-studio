import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { StyleReferenceRow } from "./style-reference-row.js";
import { useStyleReferences } from "./use-style-references.js";

interface StyleReferencesProps {
  readonly projectId: string;
}

const StyleReferences = ({ projectId }: StyleReferencesProps): ReactElement => {
  const { error, isLoading, isPending, pins, unpin } =
    useStyleReferences(projectId);

  const isEmpty = !isLoading && !error && pins.length === 0;

  let note: string = COPY.textStyleReferencesNote;

  if (isEmpty) {
    note = COPY.textStyleReferencesEmpty;
  }

  return (
    <section className="style-refs" aria-label={COPY.labelStyleReferences}>
      <div className="rules-head">
        <h3>{COPY.labelStyleReferences}</h3>
      </div>
      <p className="pane-system-text">{note}</p>
      {error && <p className="rules-error">{error}</p>}
      {pins.length > 0 && (
        <ul className="style-ref-list">
          {pins.map((pin) => (
            <StyleReferenceRow
              key={pin.id}
              isPending={isPending}
              onUnpin={unpin}
              pin={pin}
              projectId={projectId}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

export { StyleReferences };
