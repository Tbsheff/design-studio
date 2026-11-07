import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { PatternSaveSetup } from "./use-pattern-save.js";
import { usePatternSave } from "./use-pattern-save.js";

import styles from "./pattern.module.css";

const PatternSaveForm = (setup: PatternSaveSetup): ReactElement => {
  const save = usePatternSave(setup);
  const { onClose } = setup;
  let submitLabel: string = copy.save;

  if (save.isPending) {
    submitLabel = copy.saving;
  }

  return (
    <form className={styles.form} noValidate onSubmit={save.handleSubmit}>
      <div className={styles.head}>
        <strong className={styles.title}>{copy.title}</strong>
        <button className={styles.small} onClick={onClose} type="button">
          {copy.close}
        </button>
      </div>
      <label className={styles.field}>
        {copy.nameLabel}
        <input
          aria-invalid={!save.isValid}
          className={styles.input}
          name="name"
          onChange={save.handleName}
          placeholder={copy.namePlaceholder}
          value={save.name}
        />
      </label>
      {!save.isValid && (
        <span className={styles.error}>{copy.nameProblem}</span>
      )}
      <label className={styles.field}>
        {copy.tagsLabel}
        <input
          className={styles.input}
          name="tags"
          onChange={save.handleTags}
          placeholder={copy.tagsPlaceholder}
          value={save.tags}
        />
      </label>
      <div className={styles.actions}>
        <button
          className={styles.primary}
          disabled={!save.isValid || save.isPending}
          type="submit"
        >
          {submitLabel}
        </button>
        <button className={styles.small} onClick={onClose} type="button">
          {copy.cancel}
        </button>
      </div>
      <span className={styles.error} role="alert">
        {save.error}
      </span>
    </form>
  );
};

export { PatternSaveForm };
