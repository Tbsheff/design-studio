import { useEffect, useState } from "react";

import { versionDiff } from "./versions-api.js";

interface DiffMask {
  changedPct: number;
  url: string;
}

type MaskState =
  | { status: "loading" }
  | { status: "ready"; mask: DiffMask }
  | { status: "error"; message: string };

interface DiffMaskInput {
  readonly attempt: number;
  readonly newer: string;
  readonly older: string;
  readonly projectId: string;
  readonly viewport: { readonly width: number; readonly height: number };
}

interface KeyedMask {
  readonly key: string;
  readonly value: MaskState;
}

const LOADING: MaskState = { status: "loading" };

const useDiffMask = (input: DiffMaskInput): MaskState => {
  const { attempt, newer, older, projectId: ownerProjectId, viewport } = input;
  const { height, width } = viewport;
  const key = [ownerProjectId, older, newer, width, height, attempt].join("|");
  const [keyed, setKeyed] = useState<KeyedMask>({ key, value: LOADING });

  useEffect(() => {
    const controller = new AbortController();
    let url: string | null = null;

    const settle = (value: MaskState): void => {
      if (!controller.signal.aborted) {
        setKeyed({ key, value });
      }
    };

    const load = async (): Promise<void> => {
      try {
        const mask = await versionDiff(
          {
            afterId: newer,
            beforeId: older,
            projectId: ownerProjectId,
            viewport: { height, width },
          },
          controller.signal
        );

        const maskUrl = URL.createObjectURL(mask.blob);

        url = maskUrl;

        if (controller.signal.aborted) {
          URL.revokeObjectURL(maskUrl);

          return;
        }

        settle({
          mask: { changedPct: mask.changedPct, url: maskUrl },
          status: "ready",
        });
      } catch (error: unknown) {
        let message = String(error);

        if (error instanceof Error) {
          ({ message } = error);
        }

        settle({ message, status: "error" });
      }
    };

    load();

    return (): void => {
      controller.abort();

      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [key, ownerProjectId, older, newer, width, height]);

  if (keyed.key !== key) {
    return LOADING;
  }

  return keyed.value;
};

export { useDiffMask };

export type { MaskState };
