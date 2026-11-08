import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { ChipButton } from "./chip-button.js";
import { copy, EDIT_LABEL } from "./copy.js";
import { EDIT_MODES } from "./generate-model.js";
import { useEditImage } from "./use-edit-image.js";
import type { EditSetup } from "./use-edit-image.js";

import styles from "./image-generate.module.css";

const EditPanel = (setup: EditSetup): ReactElement => {
  const edit = useEditImage(setup);
  const { handlePrompt } = edit;

  const handlePromptChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      handlePrompt(event.target.value);
    },
    [handlePrompt]
  );

  return (
    <section aria-label={copy.edit} className={styles.edit}>
      <h4 className={styles.editTitle}>{copy.edit}</h4>
      <input
        aria-label={copy.editPrompt}
        disabled={edit.isPending}
        maxLength={500}
        name="edit-prompt"
        placeholder={copy.editPlaceholder}
        type="text"
        value={edit.prompt}
        onChange={handlePromptChange}
      />
      <fieldset
        aria-busy={edit.isPending}
        aria-label={copy.edit}
        className={styles.chips}
        disabled={edit.isPending}
      >
        {EDIT_MODES.map((mode) => (
          <ChipButton
            isOn={false}
            key={mode}
            label={EDIT_LABEL[mode]}
            value={mode}
            onPick={edit.handleMode}
          />
        ))}
      </fieldset>
      {edit.error && (
        <p className="ins-error" role="alert">
          {edit.error}
        </p>
      )}
    </section>
  );
};

export { EditPanel };
