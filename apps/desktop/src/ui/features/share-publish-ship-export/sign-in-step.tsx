import type { ReactElement } from "react";

import type { PublishCliState } from "../../../shared/publish.js";
import { SignInForm } from "./sign-in-form.js";
import { SignInWaiting } from "./sign-in-waiting.js";
import type { PublishCli } from "./use-publish-cli.js";

interface Props {
  busy: boolean;
  cli: PublishCliState;
  run: PublishCli["run"];
}

const SignInStep = ({ busy, cli, run }: Props): ReactElement => {
  if (cli.login.running) {
    return <SignInWaiting busy={busy} cli={cli} run={run} />;
  }

  return <SignInForm busy={busy} cli={cli} run={run} />;
};

export { SignInStep };
