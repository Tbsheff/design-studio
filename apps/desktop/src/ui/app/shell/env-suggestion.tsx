import { envText } from "@design-studio/contracts/app";
import type { ReactElement } from "react";

import { copy } from "./copy";

interface EnvSuggestionProps {
  readonly onAdd: () => void;
  readonly suggested: Record<string, string>;
}

const EnvSuggestion = ({
  onAdd,
  suggested,
}: EnvSuggestionProps): ReactElement => (
  <div className="app-env-suggest">
    <span className="app-panel-sub grow">
      {copy.theDoctorSuggests}{" "}
      <span className="mono">{envText(suggested)}</span>
    </span>
    <button type="button" className="btn small" onClick={onAdd}>
      {copy.add}
    </button>
  </div>
);

export { EnvSuggestion };
