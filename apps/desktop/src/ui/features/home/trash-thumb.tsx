import type { TrashItem } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { useTrashThumb } from "./use-trash-thumb.js";

const DOC_ICON_SIZE = 16;

const TrashThumb = ({ item }: { readonly item: TrashItem }): ReactElement => {
  const thumb = useTrashThumb(item);

  if (thumb) {
    return (
      <div className="trash-thumb" aria-hidden="true">
        <img src={thumb} alt="" draggable={false} />
      </div>
    );
  }

  return (
    <div className="trash-thumb" aria-hidden="true">
      <Icon name="doc" size={DOC_ICON_SIZE} />
    </div>
  );
};

export { TrashThumb };
