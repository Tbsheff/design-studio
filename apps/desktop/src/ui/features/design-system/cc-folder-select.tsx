import { UiSelect } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useMemo } from "react";

import type { ComponentFolder } from "../../../shared/component-create.js";
import { COPY } from "./copy.js";
import { toFolderPlaceholder } from "./create-component-model.js";

const CcFolderSelect = ({
  folder,
  folders,
  onChange,
}: {
  folder: string;
  folders: ComponentFolder[] | null;
  onChange: (folder: string) => void;
}): ReactElement => {
  const options = useMemo(
    () =>
      (folders ?? []).map((item) => ({
        label: `${item.label} · ${item.folder}`,
        value: item.folder,
      })),
    [folders]
  );

  return (
    <div className="cc-folder">
      <UiSelect
        aria-label={COPY.labelFolder}
        value={folder}
        placeholder={toFolderPlaceholder(folders)}
        disabled={!folders?.length}
        options={options}
        onChange={onChange}
      />
    </div>
  );
};

export { CcFolderSelect };
