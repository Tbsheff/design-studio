import type { ReactElement } from "react";

import { ClassChip } from "./class-chip.js";

interface ClassChipsProps {
  readonly classes: string[];
  readonly isEditable: boolean;
  readonly onRemove: (name: string) => void;
}

const ClassChips = ({
  classes,
  isEditable,
  onRemove,
}: ClassChipsProps): ReactElement => (
  <div className="prp-classes">
    {classes.map((name) => (
      <ClassChip
        key={name}
        name={name}
        isEditable={isEditable}
        onRemove={onRemove}
      />
    ))}
  </div>
);

export { ClassChips };
