import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { toChoice } from "./choose-text.js";
import { COPY } from "./copy.js";
import type { PortForm } from "./use-port-form.js";

const RouteField = ({
  form,
  isMulti,
}: {
  form: PortForm;
  isMulti: boolean;
}): ReactElement => {
  const { setRoute } = form;

  const applyRoute = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setRoute(event.target.value);
    },
    [setRoute]
  );

  return (
    <label className="field">
      <span>{toChoice(isMulti, COPY.textBaseRoute, COPY.textRoutePath)}</span>
      <input
        className="mono"
        value={form.routeText}
        placeholder={toChoice(
          form.plan.loading,
          COPY.placeholderReadingThePage,
          COPY.placeholderExampleClasses
        )}
        spellCheck={false}
        aria-invalid={Boolean(form.badRoute)}
        onChange={applyRoute}
      />
    </label>
  );
};

export { RouteField };
