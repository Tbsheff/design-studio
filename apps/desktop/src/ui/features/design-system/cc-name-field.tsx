import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { toHelpClass } from "./create-component-model.js";
import type { CreateComponent } from "./use-create-component.js";

const CcNameField = ({ form }: { form: CreateComponent }): ReactElement => {
  const { changeName, hint, name, nameProblem } = form;

  return (
    <label className="field">
      <span>{COPY.textName}</span>
      <input
        data-autofocus
        className="mono"
        value={name}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={nameProblem !== null}
        aria-describedby="cc-name-help"
        onChange={changeName}
      />
      <span id="cc-name-help" className={toHelpClass(nameProblem)}>
        {nameProblem ?? <code>{hint}</code>}
      </span>
    </label>
  );
};

export { CcNameField };
