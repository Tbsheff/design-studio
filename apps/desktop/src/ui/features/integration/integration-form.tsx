import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { IntegrationField } from "./integration-field.js";
import type { IntegrationDraft } from "./integration-model.js";
import { IntegrationTransportFields } from "./integration-transport-fields.js";
import { IntegrationTransportSelect } from "./integration-transport-select.js";
import { useIntegrationForm } from "./use-integration-form.js";

import styles from "./integration.module.css";

interface IntegrationFormProps {
  readonly isBusy: boolean;
  readonly onCancel: () => void;
  readonly onCreate: (draft: IntegrationDraft) => void;
}

const IntegrationForm = ({
  isBusy,
  onCancel,
  onCreate,
}: IntegrationFormProps): ReactElement => {
  const form = useIntegrationForm(onCreate);
  const { draft, handleDraft } = form;
  let secretNameLabel: string = copy.secretNameEnv;

  if (draft.transport === "http") {
    secretNameLabel = copy.secretNameHeader;
  }

  return (
    <form
      aria-label={copy.add}
      className={styles.form}
      noValidate
      onSubmit={form.handleSubmit}
    >
      <IntegrationField
        isInvalid={form.isNameBad}
        label={copy.nameLabel}
        name="name"
        onChange={handleDraft}
        placeholder={copy.namePlaceholder}
        type="text"
        value={draft.name}
      />
      {form.isNameBad && (
        <span className={styles.error}>{copy.nameProblem}</span>
      )}
      <IntegrationTransportSelect
        draft={draft}
        onChange={form.handleTransport}
      />
      <IntegrationTransportFields draft={draft} onChange={handleDraft} />
      <IntegrationField
        isInvalid={false}
        label={copy.secretLabel}
        name="secret"
        onChange={handleDraft}
        placeholder={copy.secretPlaceholder}
        type="password"
        value={draft.secret}
      />
      <IntegrationField
        isInvalid={false}
        label={secretNameLabel}
        name="secretName"
        onChange={handleDraft}
        placeholder=""
        type="text"
        value={draft.secretName}
      />
      <div className={styles.actions}>
        <button
          className={styles.primary}
          disabled={isBusy || !form.isReady}
          type="submit"
        >
          {copy.save}
        </button>
        <button className={styles.small} onClick={onCancel} type="button">
          {copy.cancel}
        </button>
      </div>
    </form>
  );
};

export { IntegrationForm };
