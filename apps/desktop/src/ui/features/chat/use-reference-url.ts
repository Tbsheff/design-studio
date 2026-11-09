import { api } from "../../api.js";
import { toReferenceUrlLabel } from "../../domain/reference-url.js";
import { useUrlFormOpen } from "./use-url-form-open.js";

interface ReferenceUrl {
  readonly addReferenceUrl: (url: string) => void;
  readonly closeUrlForm: () => void;
  readonly isUrlFormOpen: boolean;
  readonly openUrlForm: () => void;
}

const useReferenceUrl = (
  projectId: string,
  runImport: (
    label: string,
    start: () => Promise<{ readonly fileCount: number }>
  ) => Promise<void>
): ReferenceUrl => {
  const form = useUrlFormOpen();
  const { close: closeUrlForm, open: openUrlForm } = form;

  const addReferenceUrl = (url: string): void => {
    closeUrlForm();
    runImport(toReferenceUrlLabel(url), () =>
      api.importReferenceUrl(projectId, url)
    );
  };

  const isUrlFormOpen = form.isOpen;

  return { addReferenceUrl, closeUrlForm, isUrlFormOpen, openUrlForm };
};

export { useReferenceUrl };

export type { ReferenceUrl };
