import { CopyButton } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import type { PublishCliState } from "../../../shared/publish.js";
import { copy } from "./copy.js";
import { publishApi } from "./publish-api.js";
import type { PublishCli } from "./use-publish-cli.js";

interface Props {
  busy: boolean;
  cli: PublishCliState;
  run: PublishCli["run"];
}

const toInstallText = (cli: PublishCliState): string => {
  if (cli.installed && !cli.versionOk) {
    return `cf ${cli.version ?? ""} is too old. Publish needs cf ${cli.minVersion} or later.`;
  }

  return `Publish uses the Cloudflare CLI (cf ${cli.minVersion} or later). It is not on this Mac yet. Run this in Terminal:`;
};

const InstallStep = ({ busy, cli, run }: Props): ReactElement => {
  const checkAgain = useCallback((): void => {
    run(() => publishApi.cli(true));
  }, [run]);

  return (
    <div className="publish-step" data-testid="publish-install">
      <p className="publish-step-text">{toInstallText(cli)}</p>
      <div className="publish-command">
        <code className="mono">{cli.installCommand}</code>
        <CopyButton text={cli.installCommand} label="Copy command" />
      </div>
      <div className="publish-step-actions">
        <button
          type="button"
          className="btn small"
          disabled={busy}
          onClick={checkAgain}
        >
          {copy.checkAgain}
        </button>
      </div>
    </div>
  );
};

export { InstallStep };
