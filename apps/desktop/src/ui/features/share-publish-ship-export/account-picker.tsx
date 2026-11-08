import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import type { PublishCliState } from "../../../shared/publish.js";
import { copy } from "./copy.js";
import { publishApi } from "./publish-api.js";
import type { PublishCli } from "./use-publish-cli.js";

interface Props {
  busy: boolean;
  cli: PublishCliState;
  run: PublishCli["run"];
}

const AccountPicker = ({ busy, cli, run }: Props): ReactElement => {
  const pick = useCallback(
    (changeEvent: ChangeEvent<HTMLSelectElement>): void => {
      run(() => publishApi.setAccount(changeEvent.target.value || null));
    },
    [run]
  );

  return (
    <label className="field">
      <span>{copy.account}</span>
      <select value={cli.accountId ?? ""} disabled={busy} onChange={pick}>
        <option value="">{copy.pickAnAccount}</option>
        {cli.accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
    </label>
  );
};

export { AccountPicker };
