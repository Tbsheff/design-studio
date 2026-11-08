import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { PublishSetupBody } from "./publish-setup-body.js";
import { usePublishBackend } from "./use-publish-backend.js";
import { usePublishCli } from "./use-publish-cli.js";

const PublishSetup = (): ReactElement => {
  const state = usePublishCli();
  const backend = usePublishBackend();

  return (
    <section
      className="ship-settings publish-settings"
      aria-label={copy.publishing}
    >
      <h3>{copy.publishing}</h3>
      <p className="field-help">{copy.sharePublishPutsA}</p>
      <PublishSetupBody state={state} backend={backend} />
    </section>
  );
};

export { PublishSetup };
