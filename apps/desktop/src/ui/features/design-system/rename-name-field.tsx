import type { ChangeEvent, ReactElement } from "react";

import { COPY } from "./copy.js";

const NAME_MAX = 80;

const RenameNameField = ({
  name,
  onChange,
}: {
  name: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}): ReactElement => (
  <label className="field">
    <span>{COPY.textName}</span>
    <input
      data-autofocus
      name="name"
      value={name}
      maxLength={NAME_MAX}
      onChange={onChange}
      aria-label={COPY.labelDesignSystemName}
    />
  </label>
);

export { RenameNameField };
