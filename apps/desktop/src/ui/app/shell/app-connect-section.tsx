import type { ReactElement } from "react";

import { copy } from "./copy";

interface AppConnectSectionProps {
  readonly onOpen: () => void;
}

const AppConnectSection = ({
  onOpen,
}: AppConnectSectionProps): ReactElement => (
  <section className="ship-settings" aria-label={copy.connectAi}>
    <h3>{copy.connectAi}</h3>
    <p className="field-help">{copy.connectAiNote}</p>
    <button type="button" className="btn app-settings-open" onClick={onOpen}>
      {copy.openConnectAi}
    </button>
  </section>
);

export { AppConnectSection };
