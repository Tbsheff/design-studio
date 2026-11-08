import { useCallback } from "react";
import type { ReactElement } from "react";

import { AddButton } from "./add-button.js";
import { setShadows, toShadowRows } from "./effects-model.js";
import type { ShadowView } from "./effects-model.js";
import { ShadowRow } from "./shadow-row.js";
import { NEW_SHADOW } from "./shadows-model.js";
import type { DirectEdit } from "./use-direct-edit.js";

interface ShadowListProps {
  readonly edit: DirectEdit;
  readonly view: ShadowView;
}

const ShadowList = ({ edit, view }: ShadowListProps): ReactElement => {
  const handleAdd = useCallback(() => {
    setShadows(edit, view, (own) => [...own, NEW_SHADOW]);
  }, [edit, view]);

  return (
    <>
      {view.list.length > 0 && (
        <ul className="ins-shadows">
          {toShadowRows(view).map((row) => (
            <ShadowRow key={row.id} edit={edit} view={view} index={row.index} />
          ))}
        </ul>
      )}
      <div className="ins-add-row">
        <AddButton
          label="Shadow"
          tip={null}

          onClick={handleAdd}
        />
      </div>
    </>
  );
};

export { ShadowList };
