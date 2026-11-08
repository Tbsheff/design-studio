import { useCallback, useState } from "react";
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

const SignInForm = ({ busy, cli, run }: Props): ReactElement => {
  const [keyringChoice, setKeyringChoice] = useState<boolean | null>(null);
  const [isNarrow, setIsNarrow] = useState(true);
  const keyring = keyringChoice ?? cli.keyring;

  const changeKeyring = useCallback(
    (changeEvent: ChangeEvent<HTMLInputElement>): void => {
      setKeyringChoice(changeEvent.target.checked);
    },
    []
  );

  const changeNarrow = useCallback(
    (changeEvent: ChangeEvent<HTMLInputElement>): void => {
      setIsNarrow(changeEvent.target.checked);
    },
    []
  );

  const signIn = useCallback((): void => {
    run(() => publishApi.login(keyring, isNarrow));
  }, [run, keyring, isNarrow]);

  return (
    <div className="publish-step" data-testid="publish-sign-in">
      <p className="publish-step-text">
        {copy.cf}
        {cli.version}
        {copy.isReadySignIn}
      </p>
      {cli.login.error && <p className="publish-error">{cli.login.error}</p>}
      <label className="publish-check">
        <input type="checkbox" checked={keyring} onChange={changeKeyring} />
        <span>{copy.lockTheSignIn}</span>
      </label>
      <label className="publish-check" data-tip={copy.offCfAsks}>
        <input type="checkbox" checked={isNarrow} onChange={changeNarrow} />
        <span>{copy.askOnlyForWorkers}</span>
      </label>
      <div className="publish-step-actions">
        <button
          type="button"
          className="btn small primary"
          disabled={busy}
          onClick={signIn}
        >
          {copy.signInWithCloudflare}
        </button>
      </div>
    </div>
  );
};

export { SignInForm };
