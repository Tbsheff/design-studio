import { useCallback, useEffect, useState, useTransition } from "react";

import { api, errorText } from "../../api.js";

interface DesignMd {
  readonly changeContent: (value: string) => void;
  readonly content: string | null;
  readonly isAsking: boolean;
  readonly isDirty: boolean;
  readonly isSaving: boolean;
  readonly keepEditing: () => void;
  readonly message: string | null;
  readonly requestClose: () => false | undefined;
  readonly save: () => void;
}

interface DesignMdSource {
  readonly content: string | null;
  readonly message: string | null;
  readonly original: string | null;
  readonly setContent: (value: string) => void;
  readonly setMessage: (value: string | null) => void;
}

const useDesignMdSource = (projectId: string): DesignMdSource => {
  const [content, setContent] = useState<string | null>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    const read = async (): Promise<void> => {
      try {
        const result = await api.getDesignMd(projectId);

        if (live) {
          setContent(result.content);
          setOriginal(result.content);
        }
      } catch (error) {
        if (live) {
          setContent("");
          setMessage(
            `Could not load DESIGN.md. ${errorText(error)} Close this window and open it again.`
          );
        }
      }
    };

    read();

    return (): void => {
      live = false;
    };
  }, [projectId]);

  return { content, message, original, setContent, setMessage };
};

const useDesignMd = (projectId: string, onClose: () => void): DesignMd => {
  const { content, message, original, setContent, setMessage } =
    useDesignMdSource(projectId);

  const [isSaving, startSaving] = useTransition();
  const [isAsking, setIsAsking] = useState(false);

  const isDirty = content !== null && original !== null && content !== original;

  const requestClose = useCallback((): false | undefined => {
    if (isAsking) {
      setIsAsking(false);

      return false;
    }

    if (!isDirty) {
      onClose();

      return;
    }

    setIsAsking(true);

    return false;
  }, [isAsking, isDirty, onClose]);

  const changeContent = useCallback(
    (value: string): void => {
      setContent(value);
      setIsAsking(false);
    },
    [setContent]
  );

  const keepEditing = useCallback((): void => setIsAsking(false), []);

  const save = useCallback((): void => {
    if (content === null) {
      return;
    }

    setMessage(null);
    startSaving(async () => {
      try {
        await api.putDesignMd(projectId, content);
        onClose();
      } catch (error) {
        setIsAsking(false);
        setMessage(`Could not save DESIGN.md. ${errorText(error)} Try again.`);
      }
    });
  }, [content, onClose, projectId, setMessage]);

  return {
    changeContent,
    content,
    isAsking,
    isDirty,
    isSaving,
    keepEditing,
    message,
    requestClose,
    save,
  };
};

export { useDesignMd };

export type { DesignMd };
