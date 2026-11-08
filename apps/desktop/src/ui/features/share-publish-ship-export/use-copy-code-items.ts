import type { CopyCodeFormat } from "@design-studio/contracts/export";
import type { IconName } from "@design-studio/ui";
import { useMemo } from "react";

import { toCopyText, writeWhenReady } from "./copy-code-clipboard.js";
import { copy } from "./copy.js";
import { toErrorText } from "./error-text.js";
import { activeExportFrame, exportApi, openExport } from "./export-api.js";
import type { CopyStatus } from "./use-copy-status.js";

interface CopyCodeItem {
  readonly icon: IconName;
  readonly label: string;
  readonly handleSelect: () => void;
}

interface CopyCodeItemsInput {
  readonly close: (refocus: boolean) => void;
  readonly directionId: string | null;
  readonly projectId: string;
  readonly selector: string;
  readonly status: CopyStatus;
}

const toCodeText = async (
  input: CopyCodeItemsInput,
  format: CopyCodeFormat
): Promise<string | null> => {
  const { directionId, projectId, selector } = input;

  if (!directionId) {
    return null;
  }

  const frame = activeExportFrame(projectId);

  const result = await exportApi.copyCode(projectId, {
    directionId,
    format,
    frame,
    selector,
  });

  return result.code;
};

const copyCode = async (
  input: CopyCodeItemsInput,
  label: string,
  format: CopyCodeFormat
): Promise<void> => {
  const { close, status } = input;
  const written = writeWhenReady(toCopyText(() => toCodeText(input, format)));
  close(true);
  status.setBusy();

  try {
    await written;
    status.settle({ kind: "copied", label });
  } catch (error) {
    status.settle({ kind: "failed", message: toErrorText(error as Error) });
  }
};

const useCopyCodeItems = (input: CopyCodeItemsInput): CopyCodeItem[] => {
  const { close, directionId, projectId, selector, status } = input;

  return useMemo(() => {
    const scope = { close, directionId, projectId, selector, status };

    return [
      {
        handleSelect: (): void => {
          void copyCode(scope, "HTML", "html");
        },
        icon: "code",
        label: copy.copyHtmlAndCss,
      },
      {
        handleSelect: (): void => {
          void copyCode(scope, "Tailwind", "tailwind");
        },
        icon: "code",
        label: copy.copyTailwind,
      },
      {
        handleSelect: (): void => {
          void copyCode(scope, "React", "react");
        },
        icon: "code",
        label: copy.copyReact,
      },
      {
        handleSelect: (): void => {
          close(false);
          openExport({ format: "png", selector });
        },
        icon: "image",
        label: copy.exportPng,
      },
    ];
  }, [close, directionId, projectId, selector, status]);
};

export { useCopyCodeItems };

export type { CopyCodeItem };
