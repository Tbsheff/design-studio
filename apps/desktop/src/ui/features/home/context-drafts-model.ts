import { getReferenceProblem } from "../../domain/reference-files.js";
import { toReferenceUrlLabel } from "../../domain/reference-url.js";

interface ContextDraft {
  readonly file: File | null;
  readonly id: string;
  readonly kind: "file" | "folder" | "url";
  readonly label: string;
  readonly path: string | null;
  readonly url: string | null;
}

const MAX_CONTEXTS = 6;

const ID_RADIX = 36;

const ID_START = 2;

const ID_END = 8;

const toSuffix = (): string =>
  Math.random().toString(ID_RADIX).slice(ID_START, ID_END);

const toFileDraft = (file: File): ContextDraft => ({
  file,
  id: `file-${file.name}-${file.size}-${toSuffix()}`,
  kind: "file",
  label: file.name,
  path: null,
  url: null,
});

interface FileDrafts {
  readonly accepted: ContextDraft[];
  readonly problems: string[];
}

const toFileDrafts = (picked: File[]): FileDrafts => {
  const problems: string[] = [];
  const accepted: ContextDraft[] = [];

  for (const file of picked) {
    const problem = getReferenceProblem(file);

    if (problem === null) {
      accepted.push(toFileDraft(file));
    } else {
      problems.push(problem);
    }
  }

  return { accepted, problems };
};

const toFolderDraft = (folderPath: string): ContextDraft => {
  const parts = folderPath.split("/").filter((part) => part !== "");

  return {
    file: null,
    id: `folder-${folderPath}`,
    kind: "folder",
    label: parts.at(-1) ?? folderPath,
    path: folderPath,
    url: null,
  };
};

const toUrlDraft = (url: string): ContextDraft => ({
  file: null,
  id: `url-${url}`,
  kind: "url",
  label: toReferenceUrlLabel(url),
  path: null,
  url,
});

export { MAX_CONTEXTS, toFileDrafts, toFolderDraft, toUrlDraft };

export type { ContextDraft };
