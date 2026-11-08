import type { ReactElement } from "react";

import { AccountStep } from "./account-step.js";
import { InstallStep } from "./install-step.js";
import { BackendSetup } from "./publish-backend-setup.js";
import { SignInStep } from "./sign-in-step.js";
import type { PublishBackend } from "./use-publish-backend.js";
import type { PublishCli } from "./use-publish-cli.js";

interface Props {
  backend: PublishBackend;
  state: PublishCli;
}

const PublishSetupBody = ({ backend, state }: Props): ReactElement => {
  const { busy, cli, error, run } = state;

  if (!cli) {
    return (
      <p className="field-help">{error ?? "Looking for the Cloudflare CLI…"}</p>
    );
  }

  const isInstalled = cli.installed && cli.versionOk;
  const message = error ?? cli.error;

  return (
    <>
      {!isInstalled && <InstallStep busy={busy} cli={cli} run={run} />}
      {isInstalled && !cli.signedIn && (
        <SignInStep busy={busy} cli={cli} run={run} />
      )}
      {isInstalled && cli.signedIn && (
        <AccountStep busy={busy} cli={cli} run={run} />
      )}
      {message && (
        <div className="alert error small" role="alert">
          {message}
        </div>
      )}
      {isInstalled && <BackendSetup hook={backend} cli={cli} />}
    </>
  );
};

export { PublishSetupBody };
