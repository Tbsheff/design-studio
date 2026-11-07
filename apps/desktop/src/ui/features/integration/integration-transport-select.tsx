import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import type { IntegrationDraft } from "./integration-model.js";

import styles from "./integration.module.css";

interface IntegrationTransportSelectProps {
  readonly draft: IntegrationDraft;
  readonly onChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
}

const IntegrationTransportSelect = ({
  draft,
  onChange,
}: IntegrationTransportSelectProps): ReactElement => (
  <label className={styles.field}>
    {copy.transportLabel}
    <select
      className={styles.select}
      name="transport"
      onChange={onChange}
      value={draft.transport}
    >
      <option value="stdio">{copy.transportStdio}</option>
      <option value="http">{copy.transportHttp}</option>
    </select>
  </label>
);

export { IntegrationTransportSelect };
