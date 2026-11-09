import type { Project } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { RepoImportField } from "./repo-import-field.js";
import { UrlAttachForm } from "./url-attach-form.js";
import type { ComposerAttachments } from "./use-composer-attachments.js";

interface ComposerUrlFormsProps {
  readonly attach: ComposerAttachments;
  readonly onOpen: (project: Project) => void;
}

const ComposerUrlForms = ({
  attach,
  onOpen,
}: ComposerUrlFormsProps): ReactElement => {
  const { addContextUrl, closeUrlForm, isUrlFormOpen } = attach;

  return (
    <>
      {isUrlFormOpen && (
        <UrlAttachForm onAdd={addContextUrl} onCancel={closeUrlForm} />
      )}
      <RepoImportField onOpen={onOpen} />
    </>
  );
};

export { ComposerUrlForms };
