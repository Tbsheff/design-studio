import { useMemo, useRef } from "react";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";

import { toReadyImageIds, toRunHint } from "./comment-composer-model.js";
import type { ComposerProps, RunHint } from "./comment-composer-model.js";
import type { ComposerPlacement } from "./comment-placement.js";
import { useAutoFocus } from "./use-auto-focus.js";
import { useComposerClose } from "./use-composer-close.js";
import { useComposerDraft } from "./use-composer-draft.js";
import type { ComposerDraft } from "./use-composer-draft.js";
import { useComposerImages } from "./use-composer-images.js";
import type { ComposerImages } from "./use-composer-images.js";
import { useComposerKeys } from "./use-composer-keys.js";
import { useComposerMentions } from "./use-composer-mentions.js";
import type { Mentions } from "./use-composer-mentions.js";
import { useComposerPlacement } from "./use-composer-placement.js";
import { useComposerSubmit } from "./use-composer-submit.js";
import { useImageDrop } from "./use-image-drop.js";
import type { ImageDrop } from "./use-image-drop.js";
import { useLeadWidth } from "./use-lead-width.js";
import type { LeadBox } from "./use-lead-width.js";

interface CommentComposerState {
  area: RefObject<HTMLTextAreaElement | null>;
  card: RefObject<HTMLDialogElement | null>;
  draft: ComposerDraft;
  drop: ImageDrop;
  focusField: (event: PointerEvent<HTMLDivElement>) => void;
  hint: RunHint | null;
  images: ComposerImages;
  isBlocked: boolean;
  isClosing: boolean;
  isSubmitting: boolean;
  leadBox: LeadBox;
  leadRef: RefObject<HTMLSpanElement | null>;
  mentions: Mentions;
  onAreaKey: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onCardKey: (event: KeyboardEvent<HTMLDialogElement>) => void;
  placement: ComposerPlacement;
  scale: number;
  submit: (now: boolean) => void;
}

const useCommentComposer = (props: ComposerProps): CommentComposerState => {
  const draft = useComposerDraft(props.draftKey);
  const own = useRef<HTMLTextAreaElement>(null);
  const area = props.focusRef ?? own;
  const card = useRef<HTMLDialogElement>(null);
  const leadRef = useRef<HTMLSpanElement>(null);
  const images = useComposerImages(props.sources.projectId);
  const leadBox = useLeadWidth(leadRef, card);
  const mentions = useComposerMentions(props.sources, draft);
  const placement = useComposerPlacement(props, card);
  const { closeWith, isClosing } = useComposerClose();

  useAutoFocus(props.autoFocus, area);

  const readyIds = useMemo(
    () => toReadyImageIds(images.images),
    [images.images]
  );

  const {
    isBlocked,
    isSubmitting,
    submit: sendNow,
  } = useComposerSubmit({
    attachmentIds: readyIds,
    clearMentions: mentions.clear,
    clearText: draft.clearText,
    draftText: draft.text,
    isBaseBlocked: draft.text.trim() === "" || props.busy || images.isPending,
    mentions: mentions.mentions,
    onSubmit: props.onSubmit,
    toClaude: draft.toClaude,
  });

  const keys = useComposerKeys({
    area,
    card,
    closeWith,
    images,
    mentions,
    onCancel: props.onCancel,
    setToClaude: draft.changeToClaude,
    submit: sendNow,
    toClaude: draft.toClaude,
    trap: props.trap,
  });

  const drop = useImageDrop(Boolean(props.images), images.add, area, card);

  const { focusField, onAreaKey, onCardKey } = keys;
  const scale = 1 / props.zoom;

  const hint = toRunHint(
    props.running,
    draft.toClaude,
    props.steer,
    readyIds.length
  );

  return {
    area,
    card,
    draft,
    drop,
    focusField,
    hint,
    images,
    isBlocked,
    isClosing,
    isSubmitting,
    leadBox,
    leadRef,
    mentions,
    onAreaKey,
    onCardKey,
    placement,
    scale,
    submit: sendNow,
  };
};

export { useCommentComposer };

export type { CommentComposerState };
