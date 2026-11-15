import type { ReactNode } from "react";

import { COPY } from "./copy.js";
import { RenameManyField } from "./rename-many-field.js";
import type { RenameManyApi } from "./use-rename-many.js";

interface RenameManyPairProps {
  readonly many: RenameManyApi;
}

const RenameManyPair = ({ many }: RenameManyPairProps): ReactNode => (
  <div className="layers-rename-pair">
    <RenameManyField
      inputRef={null}
      isDisabled={false}
      label={COPY.renameManyFind}
      name="rename-find"
      value={many.fields.find}
      onValueChange={many.fields.handleFindChange}
      onFieldKeyDown={many.handleKeyDown}
    />
    <RenameManyField
      inputRef={null}
      isDisabled={false}
      label={COPY.renameManyReplace}
      name="rename-replace"
      value={many.fields.replace}
      onValueChange={many.fields.handleReplaceChange}
      onFieldKeyDown={many.handleKeyDown}
    />
  </div>
);

export { RenameManyPair };
