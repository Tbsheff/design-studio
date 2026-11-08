import { useRef, useState, useTransition } from "react";
import type { Dispatch, SetStateAction } from "react";

import { api, errorText } from "../../api.js";
import { MAX_IMAGES, getImageProblem } from "../../domain/image-limits.js";
import type { PendingAttachment } from "../../domain/pending-attachment.js";

const ID_RADIX = 36;

interface FileRules {
  readonly imageProblem: (file: File) => string | null;
  readonly maxImages: number;
}

const FILE_RULES: FileRules = {
  imageProblem: getImageProblem,
  maxImages: MAX_IMAGES,
};

interface PreviewSlot {
  url: string;
}

const openPreview = (file: File, slot: PreviewSlot): (() => void) => {
  slot.url = URL.createObjectURL(file);

  return (): void => URL.revokeObjectURL(slot.url);
};

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
  const releases = useRef(new Map<string, () => void>());

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
        const slot: PreviewSlot = { url: "" };
        releases.current.set(localId, openPreview(file, slot));
        const previewUrl = slot.url;
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

  const removeFile = (localId: string): void => {
    releases.current.get(localId)?.();
    releases.current.delete(localId);
    setFiles((prev) => prev.filter((entry) => entry.localId !== localId));
  };

  const uploading = files.some((file) => !file.attachment && !file.error);

  return { addFiles, files, removeFile, setFiles, uploading };
};

export { FILE_RULES, usePromptFiles };
