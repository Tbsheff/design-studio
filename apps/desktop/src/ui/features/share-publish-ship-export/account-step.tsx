import { useCallback } from "react";
import type { ReactElement } from "react";

import type { PublishCliState } from "../../../shared/publish.js";
import { AccountPicker } from "./account-picker.js";
import { copy } from "./copy.js";
import { publishApi } from "./publish-api.js";
import type { PublishCli } from "./use-publish-cli.js";

interface Props {
  busy: boolean;
  cli: PublishCliState;
  run: PublishCli["run"];
}

const MANY_ACCOUNTS = 1;

const OPEN_MARK = "\u003C";
const CLOSE_MARK = "\u003E";

const toPlaceholder = (name: string): string =>
  `${OPEN_MARK}${name}${CLOSE_MARK}`;

const toAddressText = (cli: PublishCliState): string => {
  const worker = toPlaceholder("name");

  if (cli.subdomain) {
    return `${worker}.${cli.subdomain}.workers.dev`;
  }

  return `${worker}.${toPlaceholder("your-subdomain")}.workers.dev`;
};

const AccountStep = ({ busy, cli, run }: Props): ReactElement => {
  const testConnection = useCallback((): void => {
    run(() => publishApi.cli(true));
  }, [run]);

  const signOut = useCallback((): void => {
    run(() => publishApi.logout());
  }, [run]);

  return (
    <div className="publish-step" data-testid="publish-signed-in">
      <div className="publish-kv">
        <span>{copy.signedIn}</span>
        <strong className="truncate">
          {cli.email ?? "Cloudflare account"}
        </strong>
      </div>
      {cli.accounts.length > MANY_ACCOUNTS && (
        <AccountPicker busy={busy} cli={cli} run={run} />
      )}
      {cli.accounts.length <= MANY_ACCOUNTS && (
        <div className="publish-kv">
          <span>{copy.account}</span>
          <strong className="truncate">
            {cli.accounts[0]?.name ?? "None"}
          </strong>
        </div>
      )}
      <div className="publish-kv">
        <span>{copy.address}</span>
        <code className="mono truncate">{toAddressText(cli)}</code>
      </div>
      <div className="publish-step-actions">
        <button
          type="button"
          className="btn small"
          disabled={busy}
          onClick={testConnection}
          data-tip={copy.asksCfWho}
        >
          {copy.testConnection}
        </button>
        <button
          type="button"
          className="btn small ghost"
          disabled={busy}
          onClick={signOut}
          data-tip={copy.runsCfAuth}
        >
          {copy.signOut}
        </button>
      </div>
    </div>
  );
};

export { AccountStep };
