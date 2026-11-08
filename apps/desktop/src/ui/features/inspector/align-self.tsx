import type { IconName } from "@design-studio/ui";
import type { ReactElement } from "react";

import { toChoice } from "./choice-model.js";
import { copy } from "./copy.js";
import { SelfButton } from "./self-button.js";
import type { DirectEdit } from "./use-direct-edit.js";

const SELF: {
  readonly value: string;
  readonly icon: IconName;
  readonly label: string;
}[] = [
  { icon: "selfStart", label: "Align self start", value: "flex-start" },
  { icon: "selfCenter", label: "Align self center", value: "center" },
  { icon: "selfEnd", label: "Align self end", value: "flex-end" },
  { icon: "selfStretch", label: "Align self stretch", value: "stretch" },
];

const toSelfSlot = (value: string): string => {
  if (value === "start" || value === "self-start") {
    return "flex-start";
  }

  if (value === "end" || value === "self-end") {
    return "flex-end";
  }

  return value;
};

const AlignSelf = ({
  edit,
  isColumn: column,
}: {
  readonly edit: DirectEdit;
  readonly isColumn: boolean;
}): ReactElement => {
  const current = toSelfSlot(edit.values["align-self"]);

  return (
    <fieldset
      className={`segmented icons ins-self ${toChoice(column, "column", "")}`}
      aria-label={copy.alignSelf}
    >
      {SELF.map((option) => (
        <SelfButton
          key={option.value}
          edit={edit}
          icon={option.icon}
          label={option.label}
          value={option.value}
          current={current}
        />
      ))}
    </fieldset>
  );
};

export { AlignSelf };
