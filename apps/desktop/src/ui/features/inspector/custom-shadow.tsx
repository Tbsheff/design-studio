import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { setShadows } from "./effects-model.js";
import type { DirectEdit } from "./use-direct-edit.js";

const CustomShadow = ({
  edit,
}: {
  readonly edit: DirectEdit;
}): ReactElement => {
  const handleClear = useCallback(() => {
    setShadows(edit, { list: [], mixed: null }, () => []);
  }, [edit]);

  return (
    <div className="ins-custom">
      <code className="ins-custom-value" data-tip={edit.values["box-shadow"]}>
        {edit.values["box-shadow"] || copy.mixed}
      </code>
      <button type="button" className="btn ghost small" onClick={handleClear}>
        {copy.clear}
      </button>
    </div>
  );
};

export { CustomShadow };
