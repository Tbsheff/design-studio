import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useCallback, useMemo } from "react";
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

const toAccountOptions = (
  accounts: PublishCliState["accounts"]
): readonly UiSelectOption[] =>
  accounts.map((account) => ({ label: account.name, value: account.id }));

const AccountPicker = ({ busy, cli, run }: Props): ReactElement => {
  const options = useMemo(() => toAccountOptions(cli.accounts), [cli.accounts]);

  const pick = useCallback(
    (accountId: string): void => {
      run(() => publishApi.setAccount(accountId || null));
    },
    [run]
  );

  return (
    <label className="field">
      <span>{copy.account}</span>
      <UiSelect
        aria-label={copy.account}
        disabled={busy}
        options={options}
        placeholder={copy.pickAnAccount}
        value={cli.accountId ?? ""}
        onChange={pick}
      />
    </label>
  );
};

export { AccountPicker };
