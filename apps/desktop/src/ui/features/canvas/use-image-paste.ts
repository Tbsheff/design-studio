import { routes } from "@design-studio/actions/canvas/routes";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type {
  ChangeEvent,
  CSSProperties,
  FormEvent,
  KeyboardEvent,
} from "react";

import { asReferenceName } from "../../../shared/reference.js";
import { api } from "../../api.js";
import { call } from "../../platform/http.js";
import { isTypingTarget } from "../../platform/typing-target.js";
import { copy } from "./copy.js";
import { hasDropImage, toImageDrop, toImageFile } from "./image-drop-model.js";
import type { ImageDrop, ImageDropCamera } from "./image-drop-model.js";
import {
  isEmptyStageAt,
  isHtmlKind,
  toPromptOrNull,
} from "./linked-frame-model.js";
import type { Point } from "./prototype-model.js";
import type { PrototypeOptions } from "./prototype-options-model.js";

interface ImageDropControl {
  readonly drop: ImageDrop | null;
  readonly isPending: boolean;
  readonly onCancel: () => void;
  readonly onSubmit: (prompt: string) => void;
}

type ImagePasteOptions = Pick<
  PrototypeOptions,
  | "active"
  | "directionId"
  | "frames"
  | "kind"
  | "notify"
  | "preview"
  | "projectId"
  | "selection"
>;

const DEFAULT_FILE = "screenshot.png";

const toCamera = (options: ImagePasteOptions): ImageDropCamera | null => {
  const { elements, frontToken } = options.preview;

  if (frontToken === null) {
    return null;
  }

  const element = elements.current[frontToken] ?? null;

  if (element === null) {
    return null;
  }

  const rect = element.getBoundingClientRect();

  if (rect.width <= 0) {
    return null;
  }

  return {
    box: { height: rect.height, width: rect.width, x: rect.x, y: rect.y },
    frame: options.active,
  };
};

const toReferenceFile = (file: File): File =>
  new File([file], asReferenceName(file.name || DEFAULT_FILE), {
    type: file.type,
  });

const isOpenDrop = (event: DragEvent): boolean =>
  !event.defaultPrevented &&
  hasDropImage(event.dataTransfer) &&
  isEmptyStageAt(event.clientX, event.clientY);

const isOpenPaste = (
  event: ClipboardEvent,
  options: ImagePasteOptions
): boolean =>
  !event.defaultPrevented &&
  !isTypingTarget(event.target) &&
  options.selection.length === 0;

const toErrorText = (error: Error | null): string =>
  error?.message ?? copy.imageDropFailed;

const toError = (cause: unknown): Error | null => {
  if (cause instanceof Error) {
    return cause;
  }

  return null;
};

const useImageListeners = (
  begin: (file: File, at: Point | null) => void,
  live: { readonly current: ImagePasteOptions }
): void => {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      if (!isOpenPaste(event, live.current)) {
        return;
      }

      const file = toImageFile(event.clipboardData?.items ?? null);

      if (file === null) {
        return;
      }

      event.preventDefault();
      begin(file, null);
    };

    const onDragOver = (event: DragEvent): void => {
      if (!isOpenDrop(event)) {
        return;
      }

      event.preventDefault();

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    };

    const onDrop = (event: DragEvent): void => {
      if (!isOpenDrop(event)) {
        return;
      }

      const file = toImageFile(event.dataTransfer?.files ?? null);

      if (file === null) {
        return;
      }

      event.preventDefault();
      begin(file, { x: event.clientX, y: event.clientY });
    };

    document.addEventListener("paste", onPaste);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);

    return (): void => {
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
    };
  }, [begin, live]);
};

const useImagePaste = (options: ImagePasteOptions): ImageDropControl => {
  const [drop, setDrop] = useState<ImageDrop | null>(null);
  const [isPending, startTransition] = useTransition();
  const live = useRef(options);

  useEffect(() => {
    live.current = options;
  });

  useEffect(
    () => (): void => {
      if (drop !== null) {
        URL.revokeObjectURL(drop.url);
      }
    },
    [drop]
  );

  const begin = useCallback((file: File, at: Point | null): void => {
    const { current } = live;

    if (!isHtmlKind(current.kind)) {
      current.notify(copy.imageDropAppNote);

      return;
    }

    const camera = toCamera(current);
    const { frames } = current;
    const start = { at, camera, file, frames };

    setDrop(toImageDrop(start, URL.createObjectURL(file)));
  }, []);

  useImageListeners(begin, live);

  const onCancel = useCallback((): void => setDrop(null), []);

  const onSubmit = useCallback(
    (prompt: string): void => {
      if (drop === null) {
        return;
      }

      const { current } = live;

      const create = async (): Promise<void> => {
        try {
          const attachment = await api.uploadAttachment(
            current.projectId,
            toReferenceFile(drop.file)
          );

          await call(routes.importFrameCanvas, {
            attachmentId: attachment.id,
            directionId: current.directionId,
            name: null,
            projectId: current.projectId,
            prompt: toPromptOrNull(prompt),
            shouldStartRun: true,
            x: drop.spot?.x ?? null,
            y: drop.spot?.y ?? null,
          });
          setDrop(null);
        } catch (error) {
          current.notify(toErrorText(toError(error)));
        }
      };

      startTransition(create);
    },
    [drop]
  );

  return { drop, isPending, onCancel, onSubmit };
};

interface ImageDropPrompt {
  readonly focusInput: (input: HTMLInputElement | null) => void;
  readonly ghostStyle: CSSProperties | null;
  readonly handleEscapeKey: (event: KeyboardEvent<HTMLInputElement>) => void;
  readonly handlePromptSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly handleTextInput: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly promptStyle: CSSProperties;
  readonly text: string;
}

const toGhostStyle = (drop: ImageDrop | null): CSSProperties | null => {
  const ghost = drop?.ghost ?? null;

  if (ghost === null) {
    return null;
  }

  return {
    height: ghost.height,
    left: ghost.x,
    top: ghost.y,
    width: ghost.width,
  };
};

const toPromptStyle = (drop: ImageDrop | null): CSSProperties => ({
  left: drop?.at.x ?? 0,
  top: drop?.at.y ?? 0,
});

const useImageDropPrompt = (control: ImageDropControl): ImageDropPrompt => {
  const [text, setText] = useState("");
  const { drop, onCancel, onSubmit } = control;
  const ghostStyle = useMemo(() => toGhostStyle(drop), [drop]);
  const promptStyle = useMemo(() => toPromptStyle(drop), [drop]);

  const focusInput = useCallback(
    (input: HTMLInputElement | null): void => input?.focus(),
    []
  );

  const handleTextInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => setText(event.target.value),
    []
  );

  const handlePromptSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      onSubmit(text);
      setText("");
    },
    [onSubmit, text]
  );

  const handleEscapeKey = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setText("");
      onCancel();
    },
    [onCancel]
  );

  return {
    focusInput,
    ghostStyle,
    handleEscapeKey,
    handlePromptSubmit,
    handleTextInput,
    promptStyle,
    text,
  };
};

export { useImageDropPrompt, useImagePaste };

export type { ImageDropControl, ImageDropPrompt };
