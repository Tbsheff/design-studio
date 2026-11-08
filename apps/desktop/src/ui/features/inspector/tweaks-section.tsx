import type { ReactElement } from "react";

import type { TweakValue } from "../../../shared/tweaks.js";
import { TweakControlRow } from "./tweak-control-row.js";
import { toSlug } from "./tweaks-model.js";
import type { EditFn, Group } from "./tweaks-model.js";

const TweaksSection = ({
  group,
  values,
  pending,
  onEdit,
  onRevert,
}: {
  readonly group: Group;
  readonly values: Record<string, TweakValue>;
  readonly pending: Record<string, TweakValue>;
  readonly onEdit: EditFn;
  readonly onRevert: (id: string) => void;
}): ReactElement => (
  <section
    className="twk-section"
    aria-labelledby={`twk-sec-${toSlug(group.label)}`}
  >
    <h3 className="twk-section-head" id={`twk-sec-${toSlug(group.label)}`}>
      {group.label}
    </h3>
    <ul className="twk-list">
      {group.controls.map((control) => (
        <TweakControlRow
          key={control.id}
          control={control}
          value={values[control.id] ?? control.default}
          isChanged={Object.hasOwn(pending, control.id)}
          onEdit={onEdit}
          onRevert={onRevert}
        />
      ))}
    </ul>
  </section>
);

export { TweaksSection };
