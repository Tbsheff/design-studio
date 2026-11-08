import type {
  ShareLink,
  ShareServerState,
} from "@design-studio/contracts/share";

interface ShareState {
  readonly links: readonly ShareLink[];
  readonly server: ShareServerState;
  readonly error: string | null;
  readonly isBusy: boolean;
  readonly act: (task: () => Promise<void>) => Promise<void>;
}

interface ShareCopied {
  readonly id: string | null;
  readonly made: (id: string) => void;
}

export type { ShareCopied, ShareState };
