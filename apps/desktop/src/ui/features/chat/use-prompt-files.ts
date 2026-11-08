import { useState, useTransition } from "react";
import type { Dispatch, SetStateAction } from "react";

import { api, errorText } from "../../api.js";
import type { PendingAttachment } from "../../domain/pending-attachment.js";

const ID_RADIX = 36;

interface FileRules {
  readonly createPreviewUrl: (file: File) => string;
  readonly imageProblem: (file: File) => string | null;
  readonly maxImages: number;
}

type FileUpdate = Partial<PendingAttachment>;

interface UsePromptFilesResult {
  readonly addFiles: (list: Iterable<File>) => void;
  readonly files: PendingAttachment[];
  readonly removeFile: (localId: string) => void;
  readonly setFiles: Dispatch<SetStateAction<PendingAttachment[]>>;
  readonly uploading: boolean;
}

const toLocalId = (): string =>
  `${Date.now()}-${Math.random().toString(ID_RADIX).slice(2)}`;

const toFileProblem = (
  file: File,
  room: number,
  rules: FileRules
): string | null => {
  const problem = rules.imageProblem(file);

  if (problem) {
    return problem;
  }

  if (room <= 0) {
    return `You can attach up to ${rules.maxImages} images.`;
  }

  return null;
};

const toPatchedFiles = (
  files: PendingAttachment[],
  localId: string,
  update: FileUpdate
): PendingAttachment[] =>
  files.map((entry) => {
    if (entry.localId === localId) {
      return { ...entry, ...update };
    }

    return entry;
  });

const usePromptFiles = (
  projectId: string,
  setError: (message: string | null) => void,
  rules: FileRules
): UsePromptFilesResult => {
  const [files, setFiles] = useState<PendingAttachment[]>([]);
  const [, startUpload] = useTransition();

  const uploadFile = async (file: File, localId: string): Promise<void> => {
    try {
      const attachment = await api.uploadAttachment(projectId, file);
      setFiles((prev) => toPatchedFiles(prev, localId, { attachment }));
    } catch (thrownError: unknown) {
      setFiles((prev) =>
        toPatchedFiles(prev, localId, { error: errorText(thrownError) })
      );
    }
  };

  const addFiles = (list: Iterable<File>): void => {
    let room = rules.maxImages - files.length;
    const problems = new Set<string>();
    const uploads: Promise<void>[] = [];

    for (const file of list) {
      const problem = toFileProblem(file, room, rules);

      if (problem) {
        problems.add(problem);
      } else {
        room -= 1;
        const localId = toLocalId();
        const { name } = file;
        const previewUrl = rules.createPreviewUrl(file);
        setFiles((prev) => [
          ...prev,
          {
            attachment: null,
            error: null,
            localId,
            name,
            previewUrl,
          },
        ]);
        uploads.push(uploadFile(file, localId));
      }
    }

    startUpload(async () => {
      await Promise.all(uploads);
    });

    if (problems.size > 0) {
      setError([...problems].join(" "));
    }
  };

  const removeFile = (localId: string): void =>
    setFiles((prev) => {
      const file = prev.find((entry) => entry.localId === localId);

      if (file) {
        URL.revokeObjectURL(file.previewUrl);
      }

      return prev.filter((entry) => entry.localId !== localId);
    });

  const uploading = files.some((file) => !file.attachment && !file.error);

  return { addFiles, files, removeFile, setFiles, uploading };
};

export { usePromptFiles };
