import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { PublishSetupBody } from "./publish-setup-body.js";
import type { PublishBackend } from "./use-publish-backend.js";
import type { PublishCli } from "./use-publish-cli.js";

interface PublishSetupFoldProps {
  readonly backend: PublishBackend;
  readonly cli: PublishCli;
}

const PublishSetupFold = ({
  backend,
  cli,
}: PublishSetupFoldProps): ReactElement => (
  <details className="publish-settings">
    <summary>{copy.cloudflareSetup}</summary>
    <PublishSetupBody state={cli} backend={backend} />
  </details>
);

export { PublishSetupFold };
