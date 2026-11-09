import type {
  CompiledTokenEntry,
  ComponentInfo,
  Project,
  ProjectSettings,
  QueuedMessage,
  RunEffort,
  RunLevel,
  RunMention,
  SelectionContext,
} from "@design-studio/contracts";

import type { DraftStore } from "../../platform/storage.js";
import type { ComposerMode } from "./composer-mode-model.js";
import type { VariationsPromptProps } from "./prompt-box-model.js";
import type { MentionRequest } from "./use-mentions.js";
import type { RunCanvasChip } from "./use-run-canvas.js";

type PromptSend = (
  ...args: [
    prompt: string,
    mode: ComposerMode,
    attachmentIds: string[],
    level: RunLevel,
    effort: RunEffort | null,
    mentions: RunMention[],
    commentIds?: string[],
    focusPaths?: string[],
  ]
) => Promise<void>;

interface PromptBoxProps {
  projectId: string;
  model: string;
  settings: ProjectSettings;
  onSettingsSaved: (project: Project) => void;
  draft: DraftStore;
  selection: SelectionContext[];
  onRemoveSelection: (selector: string) => void;
  canvasChip?: RunCanvasChip | null;
  running: boolean;
  disabled: boolean;
  onSend: PromptSend;
  onCancel: () => void;
  variations?: VariationsPromptProps;
  queued?: boolean;
  queue?: QueuedMessage[];
  onQueueChange?: (items: QueuedMessage[]) => void;
  onSteer?: (text: string) => void;
  history?: string[];
  contextTokens?: number | null;
  directionId?: string | null;
  tokens?: CompiledTokenEntry[];
  components?: ComponentInfo[] | null;
  mentionRequest?: MentionRequest | null;
  waitReason?: string | null;
}

export type { PromptBoxProps, PromptSend };
