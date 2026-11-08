import type { TrashItem } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { formatRelative, formatTime } from "../../domain/format.js";
import { copy } from "./copy.js";

const TrashRowText = ({ item }: { readonly item: TrashItem }): ReactElement => (
  <div className="trash-text">
    <span className="trash-name" data-tip={item.name}>
      {item.name}
    </span>
    <span className="trash-meta">
      <time
        dateTime={new Date(item.trashedAt).toISOString()}
        data-tip={formatTime(item.trashedAt)}
      >
        {copy.deleted}
        {formatRelative(item.trashedAt).toLowerCase()}
      </time>
      {item.folderStays && <span>{copy.filesInYourFolderStay}</span>}
    </span>
  </div>
);

export { TrashRowText };
