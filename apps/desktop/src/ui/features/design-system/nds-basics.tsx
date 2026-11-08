import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { COPY } from "./copy.js";
import { ModeSelect } from "./nds-mode-select.js";
import type { DraftForm, Mode, Patch } from "./new-design-system-values.js";

const NAME_MAX = 80;

const Basics = ({
  form,
  set,
}: {
  form: DraftForm;
  set: (patch: Patch) => void;
}): ReactElement => {
  const typeName = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      set({ name: event.target.value }),
    [set]
  );

  const pickMode = useCallback((mode: Mode): void => set({ mode }), [set]);

  return (
    <fieldset
      className="nds-basics"
      aria-label={COPY.labelDesignSystemSettings}
    >
      <label className="field">
        <span>{COPY.textName}</span>
        <input
          value={form.name}
          maxLength={NAME_MAX}
          placeholder={COPY.placeholderFromTheWebsiteOrBrief}
          aria-label={COPY.labelDesignSystemName}
          onChange={typeName}
        />
      </label>
      <ModeSelect value={form.mode} onChange={pickMode} />
    </fieldset>
  );
};

export { Basics };
