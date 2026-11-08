import { useCallback } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { ChipRow } from "./chip-row.js";
import { ASPECT_LABEL, copy, STYLE_LABEL } from "./copy.js";
import { EditPanel } from "./edit-panel.js";
import { ASPECTS, STYLES } from "./generate-model.js";
import { MockNote } from "./mock-note.js";
import { useGenerate } from "./use-generate.js";
import type { GenerateSetup } from "./use-generate.js";
import { VariantGrid } from "./variant-grid.js";

import styles from "./image-generate.module.css";

const GeneratePanel = (setup: GenerateSetup): ReactElement => {
  const generate = useGenerate(setup);
  const { handleGenerate, handlePrompt } = generate;
  const handleDone = setup.onDone;

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      handleGenerate();
    },
    [handleGenerate]
  );

  const handlePromptChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      handlePrompt(event.target.value);
    },
    [handlePrompt]
  );

  let label: string = copy.generate;

  if (generate.isPending) {
    label = copy.generating;
  }

  return (
    <div className={styles.panel}>
      {generate.isMock && <MockNote />}
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          aria-label={copy.prompt}
          maxLength={500}
          name="prompt"
          placeholder={copy.placeholder}
          type="text"
          value={generate.prompt}
          onChange={handlePromptChange}
        />
        <button
          className="btn"
          disabled={generate.isPending || generate.prompt.trim() === ""}
          type="submit"
        >
          {label}
        </button>
      </form>
      <ChipRow
        choices={ASPECTS}
        label={copy.aspect}
        labels={ASPECT_LABEL}
        value={generate.aspect}
        onPick={generate.handleAspect}
      />
      <ChipRow
        choices={STYLES}
        label={copy.style}
        labels={STYLE_LABEL}
        value={generate.style}
        onPick={generate.handleStyle}
      />
      {generate.error && (
        <p className="ins-error" role="alert">
          {generate.error.message}
        </p>
      )}
      <VariantGrid
        isBusy={generate.isPending}
        variants={generate.variants}
        onUse={generate.handleUse}
      />
      <EditPanel
        directionId={setup.directionId}
        projectId={setup.projectId}
        target={setup.target}
        onDone={handleDone}
      />
    </div>
  );
};

export { GeneratePanel };
