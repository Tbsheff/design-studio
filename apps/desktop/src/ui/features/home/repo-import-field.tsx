import type { Project } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { stopRepoImport } from "./repo-import-model.js";
import { useRepoImport } from "./use-repo-import.js";

const RepoImportField = ({
  onOpen,
}: {
  readonly onOpen: (project: Project) => void;
}): ReactElement | null => {
  const {
    inputRef,
    isOpen,
    isPending,
    onImport,
    onKey,
    onText,
    problem,
    value,
  } = useRepoImport(onOpen);

  if (!isOpen) {
    return null;
  }

  return (
    <fieldset className="url-attach" data-testid="repo-import">
      <legend className="sr-only">{copy.importFromGithub}</legend>
      <Icon name="download" size={14} />
      <input
        ref={inputRef}
        type="url"
        className="url-attach-input"
        value={value}
        disabled={isPending}
        placeholder={copy.repoImportPlaceholder}
        aria-label={copy.repoImportLabel}
        aria-invalid={problem !== null}
        data-testid="repo-import-input"
        onChange={onText}
        onKeyDown={onKey}
      />
      <button
        type="button"
        className="btn small primary"
        disabled={isPending}
        data-testid="repo-import-submit"
        onClick={onImport}
      >
        {copy.repoImportImport}
      </button>
      <button
        type="button"
        className="btn small ghost"
        disabled={isPending}
        onClick={stopRepoImport}
      >
        {copy.cancel}
      </button>
      {isPending && (
        <output className="url-attach-status">{copy.repoImportCloning}</output>
      )}
      {problem !== null && (
        <span className="url-attach-problem" role="alert">
          {problem}
        </span>
      )}
    </fieldset>
  );
};

export { RepoImportField };
