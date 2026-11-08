import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useId } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type {
  IntegrationDraft,
  IntegrationTransport,
} from "./integration-model.js";

import styles from "./integration.module.css";

interface IntegrationTransportSelectProps {
  readonly draft: IntegrationDraft;
  readonly onChange: (transport: IntegrationTransport) => void;
}

const TRANSPORT_OPTIONS: readonly UiSelectOption<IntegrationTransport>[] = [
  { label: copy.transportStdio, value: "stdio" },
  { label: copy.transportHttp, value: "http" },
];

const IntegrationTransportSelect = ({
  draft,
  onChange,
}: IntegrationTransportSelectProps): ReactElement => {
  const transportId = useId();

  return (
    <div className={styles.field}>
      <label htmlFor={transportId}>{copy.transportLabel}</label>
      <UiSelect
        id={transportId}
        options={TRANSPORT_OPTIONS}
        value={draft.transport}
        onChange={onChange}
      />
    </div>
  );
};

export { IntegrationTransportSelect };
