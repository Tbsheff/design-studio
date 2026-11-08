interface ContextDraft {
  readonly file: File | null;
  readonly id: string;
  readonly kind: "file" | "folder";
  readonly label: string;
  readonly path: string | null;
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
});

const toFolderDraft = (folderPath: string): ContextDraft => {
  const parts = folderPath.split("/").filter((part) => part !== "");

  return {
    file: null,
    id: `folder-${folderPath}`,
    kind: "folder",
    label: parts.at(-1) ?? folderPath,
    path: folderPath,
  };
};

export { MAX_CONTEXTS, toFileDraft, toFolderDraft };

export type { ContextDraft };
