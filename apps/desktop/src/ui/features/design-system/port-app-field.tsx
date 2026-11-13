import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { AttachField } from "./port-attach-field.js";
import type { PortForm } from "./use-port-form.js";

const AppField = ({ form }: { form: PortForm }): ReactElement => {
  const { apps, error } = form.targets;
  const { reload } = form.targets;
  const { setAppId } = form;

  const options = useMemo<UiSelectOption[]>(
    () => (apps ?? []).map((app) => ({ label: app.name, value: app.id })),
    [apps]
  );

  const attached = useCallback(
    (projectId: string): void => {
      setAppId(projectId);
      reload();
    },
    [reload, setAppId]
  );

  if (apps?.length === 0) {
    return <AttachField error={error} onAttached={attached} />;
  }

  let placeholder: string = COPY.placeholderPickAnApp;

  if (!apps) {
    placeholder = COPY.placeholderLoadingApps;
  }

  return (
    <div className="field">
      <span id="port-app-label">{COPY.textTargetApp}</span>
      <UiSelect
        aria-labelledby="port-app-label"
        value={form.chosenApp}
        options={options}
        onChange={setAppId}
        placeholder={placeholder}
        disabled={!apps}
      />
    </div>
  );
};

export { AppField };
