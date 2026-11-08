import type { Icon } from "@design-studio/ui";
import type { RefObject } from "react";

import { toChoice } from "./choose-text.js";
import type { Breadcrumb, PinOffset } from "./comment-placement.js";
import { copy } from "./copy.js";
import { readStored, writeStored } from "./deps.js";
import type {
  CompiledTokenEntry,
  ComponentInfo,
  MentionOption,
  RunMention,
  SelectionContext,
} from "./deps.js";

type Rect = SelectionContext["rect"];

interface ComposerSources {
  projectId: string;
  directionId: string | null;
  tokens?: readonly CompiledTokenEntry[];
  components?: readonly ComponentInfo[] | null;
}

interface ComposerSubmit {
  text: string;
  toClaude: boolean;
  now: boolean;
  mentions: RunMention[];
  attachmentIds: string[];
}

interface ComposerProps {
  label: string;
  testId: string;
  anchor: Rect;
  offset?: PinOffset;
  zoom: number;
  frame: { width: number; height: number };
  breadcrumb: Breadcrumb;
  initial: string | null;
  shouldFocus: boolean;
  trap: boolean;
  focusRef?: RefObject<HTMLTextAreaElement | null>;
  draftKey: string;
  running: boolean;
  busy: boolean;
  sources: ComposerSources;
  images: boolean;
  steer: boolean;
  onSubmit: (input: ComposerSubmit) => Promise<boolean>;
  onCancel: () => void;
}

interface ImageChip {
  key: string;
  url: string;
  name: string;
  id: string | null;
  failed: boolean;
}

const SEND_KEY = "studio.comments.sendToClaude";

const CLOSE_MS = 120;

const IMAGE_MAX = 4;

const LEAD_GAP = 6;

const MIN_FIRST_LINE = 140;

const TEXT_MAX = 2000;

const CLAUDE_OPTION: MentionOption = {
  detail: copy.textSendToClaude,
  icon: "sparkle",
  key: "agent:claude",
  label: copy.textClaude,
  mention: {
    file: null,
    kind: "component",
    name: copy.textClaude,
    selector: null,
  },
};

const drafts = new Map<string, string>();

const readSend = (): boolean => readStored(SEND_KEY) === "1";

const writeSend = (isOn: boolean): void => {
  if (isOn) {
    writeStored(SEND_KEY, "1");

    return;
  }

  writeStored(SEND_KEY, "0");
};

const hasReducedMotion = (): boolean =>
  "window" in globalThis &&
  globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

const toImageFiles = (list: FileList | null): File[] =>
  [...(list ?? [])].filter((file) => file.type.startsWith("image/"));

const toReadyImageIds = (images: ImageChip[]): string[] => {
  const ids: string[] = [];

  for (const image of images) {
    if (image.id !== null) {
      ids.push(image.id);
    }
  }

  return ids;
};

interface RunHint {
  queueOnly: boolean;
}

const toRunHint = (
  isRunning: boolean,
  toClaude: boolean,
  canSteer: boolean,
  imageCount: number
): RunHint | null => {
  if (!isRunning || !toClaude) {
    return null;
  }

  return { queueOnly: !canSteer || imageCount > 0 };
};

interface SubmitView {
  className: string;
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  tip: string;
}

const toSubmitView = (toClaude: boolean): SubmitView => {
  if (toClaude) {
    return {
      className: "comment-submit to-claude",
      icon: "arrowUp",
      label: copy.textSend,
      tip: copy.tipSend,
    };
  }

  return {
    className: "comment-submit",
    icon: "check",
    label: copy.textSaveComment,
    tip: copy.tipSaveComment,
  };
};

const toThumbClass = (image: ImageChip): string => {
  const loading = toChoice(image.id !== null, "", " loading");
  const failed = toChoice(image.failed, " failed", "");

  return `comment-thumb${loading}${failed}`;
};

const toThumbTip = (image: ImageChip): string => {
  if (image.failed) {
    return `${image.name}${copy.textDidNotUpload}`;
  }

  return image.name;
};

const toTextIndent = (isInline: boolean, width: number): number => {
  if (isInline) {
    return width + LEAD_GAP;
  }

  return 0;
};

const patchImage = (
  images: ImageChip[],
  key: string,
  patch: Partial<ImageChip>
): ImageChip[] =>
  images.map((image) => {
    if (image.key === key) {
      return { ...image, ...patch };
    }

    return image;
  });

export {
  CLAUDE_OPTION,
  CLOSE_MS,
  drafts,
  hasReducedMotion,
  IMAGE_MAX,
  LEAD_GAP,
  MIN_FIRST_LINE,
  patchImage,
  readSend,
  TEXT_MAX,
  toImageFiles,
  toRunHint,
  toSubmitView,
  toThumbClass,
  toTextIndent,
  toThumbTip,
  toReadyImageIds,
  writeSend,
};

export type {
  ComposerProps,
  ComposerSources,
  ComposerSubmit,
  ImageChip,
  Rect,
  RunHint,
  SubmitView,
};
