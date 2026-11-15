import {
  SHARE_DEFAULT_EXPIRY_HOURS,
  SHARE_MAX_FRAMES,
} from "@design-studio/contracts/share";
import type {
  ShareExpiryHours,
  ShareLink,
} from "@design-studio/contracts/share";
import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { sessionTokens } from "../../platform/share-tokens.js";
import { canvasFrameChoices } from "./export-api.js";
import type { FrameChoice } from "./export-api.js";
import { shareApi } from "./share-api.js";
import type { ShareCopied, ShareState } from "./share-types.js";

interface ShareTargetInput {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly versionId: string | null;
}

interface ShareForm {
  readonly frames: readonly FrameChoice[];
  readonly picked: ReadonlySet<string>;
  readonly expiry: ShareExpiryHours;
  readonly isLiveView: boolean;
  readonly shown: readonly ShareLink[];
  readonly hasLive: boolean;
  readonly hasVersion: boolean;
  readonly canCreate: boolean;
  readonly onToggle: (id: string) => void;
  readonly onExpiry: (value: ShareExpiryHours) => void;
  readonly onLiveView: (isOn: boolean) => void;
  readonly onSubmit: (event: FormEvent) => void;
}

const INACTIVE_SHOWN = 3;

const toggleInSet = (
  previous: ReadonlySet<string>,
  id: string
): Set<string> => {
  const next = new Set(previous);

  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }

  return next;
};

const toShownLinks = (links: readonly ShareLink[]): ShareLink[] => [
  ...links.filter((link) => link.active),
  ...links.filter((link) => !link.active).slice(0, INACTIVE_SHOWN),
];

const useShareForm = (
  target: ShareTargetInput,
  shares: ShareState,
  copied: ShareCopied
): ShareForm => {
  const frames = useMemo(
    () => canvasFrameChoices(target.projectId, target.directionId),
    [target.projectId, target.directionId]
  );

  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(frames.slice(0, SHARE_MAX_FRAMES).map((choice) => choice.id))
  );

  const [expiry, setExpiry] = useState<ShareExpiryHours>(
    SHARE_DEFAULT_EXPIRY_HOURS
  );

  const [isLiveView, setIsLiveView] = useState(false);
  const { versionId } = target;
  const chosenChoices = frames.filter((frame) => picked.has(frame.id));

  const canCreate =
    Boolean(versionId) &&
    chosenChoices.length > 0 &&
    chosenChoices.length <= SHARE_MAX_FRAMES &&
    !shares.isBusy;

  const onToggle = useCallback((id: string): void => {
    setPicked((previous) => toggleInSet(previous, id));
  }, []);

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();

    if (!canCreate || !versionId) {
      return;
    }

    void shares.act(async () => {
      const made = await shareApi.create(target.projectId, {
        directionId: target.directionId,
        expiresInHours: expiry,
        frameIds: chosenChoices.map((choice) => choice.id),
        frames: chosenChoices.map((choice) => choice.frame),
        live: isLiveView,
        versionId,
      });

      sessionTokens.set(made.link.id, made.token);
      copied.made(made.link.id);
    });
  };

  const onExpiry = setExpiry;
  const onLiveView = setIsLiveView;
  const hasLive = shares.links.some((link) => link.active);
  const hasVersion = Boolean(versionId);
  const shown = toShownLinks(shares.links);

  return {
    canCreate,
    expiry,
    frames,
    hasLive,
    hasVersion,
    isLiveView,
    onExpiry,
    onLiveView,
    onSubmit,
    onToggle,
    picked,
    shown,
  };
};

export { useShareForm };

export type { ShareForm, ShareTargetInput };
