import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { LibraryGroupBody } from "./library-group-body.js";

const toGroupId = (title: string): string =>
  `lib-${title.toLowerCase().replaceAll(/\W+/gu, "-")}`;

const LibraryGroup = ({
  onNew,
  onOpen,
  packs,
  title,
}: {
  onNew: (() => void) | null;
  onOpen: (pack: PackSummary) => void;
  packs: PackSummary[];
  title: string;
}): ReactElement => {
  const id = toGroupId(title);

  return (
    <section className="lib-group" aria-labelledby={id}>
      <h2 id={id}>
        {title} <span className="lib-count">{packs.length}</span>
      </h2>
      <LibraryGroupBody onNew={onNew} onOpen={onOpen} packs={packs} />
    </section>
  );
};

export { LibraryGroup };
