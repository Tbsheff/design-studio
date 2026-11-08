import { routes } from "@design-studio/actions/token/routes";
import { copyText } from "@design-studio/ui";
import { useCallback, useState, useTransition } from "react";

import { useAction } from "../../platform/query.js";
import type { ActionState } from "../../platform/query.js";
import { COPY } from "./copy.js";

type TokenExportView = NonNullable<
  ActionState<typeof routes.exportToken>["data"]
>;

type TokenExportFormat = TokenExportView["format"];

interface TokenExportSetup {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface TokenExportState {
  readonly error: string | null;
  readonly handleCopy: () => void;
  readonly handleRun: (format: TokenExportFormat) => void;
  readonly handleSave: () => void;
  readonly isBusy: boolean;
  readonly isCopied: boolean;
  readonly result: TokenExportView | null;
}

interface TokenExportOption {
  readonly format: TokenExportFormat;
  readonly label: string;
}

const TOKEN_EXPORT_OPTIONS: readonly TokenExportOption[] = [
  { format: "figma", label: COPY.exportFigma },
  { format: "dtcg", label: COPY.exportDtcg },
  { format: "tailwind", label: COPY.exportTailwind },
  { format: "css", label: COPY.exportCss },
];

const saveText = (view: TokenExportView): void => {
  const blob = new Blob([view.text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = view.fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const toErrorText = (error: Error | null): string | null => {
  if (error === null) {
    return null;
  }

  return COPY.exportFailed;
};

const useTokenExport = (setup: TokenExportSetup): TokenExportState => {
  const exporter = useAction(routes.exportToken);
  const [result, setResult] = useState<TokenExportView | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isBusy, startWork] = useTransition();
  const { run } = exporter;
  const { directionId, projectId } = setup;

  const handleRun = useCallback(
    (format: TokenExportFormat): void => {
      startWork(async () => {
        const groups = null;
        const modes = "light-dark";

        const done = await run({
          directionId,
          format,
          groups,
          modes,
          projectId,
        });

        setIsCopied(false);
        setResult(done);
      });
    },
    [directionId, projectId, run]
  );

  const handleCopy = useCallback((): void => {
    if (result === null) {
      return;
    }

    startWork(async () => {
      setIsCopied(await copyText(result.text));
    });
  }, [result]);

  const handleSave = useCallback((): void => {
    if (result !== null) {
      saveText(result);
    }
  }, [result]);

  const error = toErrorText(exporter.error);

  return {
    error,
    handleCopy,
    handleRun,
    handleSave,
    isBusy,
    isCopied,
    result,
  };
};

export { TOKEN_EXPORT_OPTIONS, useTokenExport };

export type {
  TokenExportFormat,
  TokenExportOption,
  TokenExportSetup,
  TokenExportState,
  TokenExportView,
};
