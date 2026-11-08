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

const SignInWaiting = ({ busy, cli, run }: Props): ReactElement => {
  const cancelLogin = useCallback((): void => {
    run(() => publishApi.cancelLogin());
  }, [run]);

  return (
    <div className="publish-step" data-testid="publish-signing-in">
      <p className="publish-step-text">{copy.finishTheCloudflareSign}</p>
      <div className="publish-step-actions">
        {cli.login.url && (
          <a
            className="btn small"
            href={cli.login.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            {copy.openSignInPage}
          </a>
        )}
        <button
          type="button"
          className="btn small ghost"
          disabled={busy}
          onClick={cancelLogin}
        >
          {copy.cancel}
        </button>
      </div>
    </div>
  );
};

export { SignInWaiting };
