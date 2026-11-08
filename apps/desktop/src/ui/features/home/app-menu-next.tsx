import type { ReactElement } from "react";

import { AppCandidates } from "./app-candidates.js";
import type { AppChip } from "./app-chip-model.js";
import { AppTokensButton } from "./app-tokens-button.js";
import { DevServerSection } from "./dev-server-section.js";

interface AppMenuNextProps {
  readonly chip: AppChip;
  readonly onChange: (patch: Partial<AppChip>) => void;
  readonly onTokensOnly: () => void;
}

const AppMenuNext = ({
  chip,
  onChange,
  onTokensOnly,
}: AppMenuNextProps): ReactElement => (
  <>
    <AppCandidates chip={chip} onChange={onChange} />
    <DevServerSection chip={chip} onChange={onChange} />
    <AppTokensButton onTokensOnly={onTokensOnly} />
  </>
);

export { AppMenuNext };
