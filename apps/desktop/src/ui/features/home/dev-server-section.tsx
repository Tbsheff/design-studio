import { useCallback } from "react";
import type { ReactElement } from "react";

import type { AppChip, RunMode } from "./app-chip-model.js";
import { copy } from "./copy.js";
import { DevServerEnv } from "./dev-server-env.js";
import { DevServerUrl } from "./dev-server-url.js";
import { ModeButton } from "./home-popovers.js";

interface DevServerSectionProps {
  readonly chip: AppChip;
  readonly onChange: (patch: Partial<AppChip>) => void;
}

const DevServerSection = ({
  chip,
  onChange,
}: DevServerSectionProps): ReactElement => {
  const selectMode = useCallback(
    (mode: RunMode): void => {
      onChange({ mode });
    },
    [onChange]
  );

  const changeUrl = useCallback(
    (url: string): void => {
      onChange({ url });
    },
    [onChange]
  );

  const changeEnv = useCallback(
    (env: string): void => {
      onChange({ env });
    },
    [onChange]
  );

  return (
    <div className="ui-menu-section home-app-server">
      <span className="ui-menu-label">{copy.devServer}</span>
      <div className="segmented" role="radiogroup" aria-label={copy.devServer}>
        <ModeButton
          mode="start"
          current={chip.mode}
          label={copy.startNextDev}
          onSelect={selectMode}
        />
        <ModeButton
          mode="url"
          current={chip.mode}
          label={copy.labelUseMyRunningServer}
          onSelect={selectMode}
        />
      </div>
      {chip.mode === "url" && <DevServerUrl url={chip.url} onUrl={changeUrl} />}
      <DevServerEnv env={chip.env} onEnv={changeEnv} />
    </div>
  );
};

export { DevServerSection };
