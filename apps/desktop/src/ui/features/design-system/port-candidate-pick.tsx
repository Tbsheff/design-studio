import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useMemo } from "react";
import type { ReactElement } from "react";

import type { FolderInspection } from "../../../shared/open-app.js";
import { COPY } from "./copy.js";

const CandidatePick = ({
  found,
  value,
  onChange,
}: {
  found: FolderInspection;
  value: string;
  onChange: (appDir: string) => void;
}): ReactElement => {
  const options = useMemo<UiSelectOption[]>(
    () =>
      found.candidates.map((candidate) => ({
        label: `${candidate.name} · ${candidate.appDir}`,
        value: candidate.appDir,
      })),
    [found]
  );

  return (
    <div className="field">
      <span id="port-candidate-label">{COPY.textAppInThisFolder}</span>
      <UiSelect
        aria-labelledby="port-candidate-label"
        value={value}
        options={options}
        onChange={onChange}
        placeholder={COPY.placeholderPickAnApp}
      />
    </div>
  );
};

export { CandidatePick };
