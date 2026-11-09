import type { BridgeToParent } from "@design-studio/contracts";
import { staticLinkIssue } from "@design-studio/contracts/links";
import type { LinkQuery, LinkRectReport } from "@design-studio/contracts/links";
import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";

import { postToFrame, useBridge } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import {
  readStored,
  removeStored,
  writeStored,
} from "../../platform/storage.js";
import { useLatest } from "../../platform/use-latest.js";
import {
  FLASH_MS,
  HOTSPOT_OFF,
  toHotspotKey,
  toHotspotRects,
  toStoredHints,
} from "./hotspot-model.js";
import type { HotspotFlash, Rect } from "./hotspot-model.js";
import type { PlayModeProps, Slot } from "./play-model.js";
import { linkQuery } from "./use-link-rects.js";

interface HotspotHints {
  readonly flashCount: number;
  readonly isEnabled: boolean;
  readonly isHeld: boolean;
  readonly setEnabled: (next: boolean) => void;
  readonly spots: Readonly<Record<string, readonly Rect[]>>;
}

interface HotspotInput {
  readonly elements: RefObject<Record<string, HTMLIFrameElement | null>>;
  readonly props: PlayModeProps;
  readonly slots: Slot[];
}

const toSlotQueries = (props: PlayModeProps, slot: Slot): LinkQuery[] => {
  const queries: LinkQuery[] = [];

  for (const link of props.file.links) {
    if (
      link.from.frame === slot.frame.id &&
      !link.trigger &&
      staticLinkIssue(link, props.frames) === null
    ) {
      queries.push(linkQuery(link));
    }
  }

  return queries;
};

const toHintFrame = (input: HotspotInput, slot: Slot): BridgeFrame => ({
  element: input.elements.current[slot.token] ?? null,
  key: slot.token,
  kind: input.props.kind,
  token: slot.token,
  url: slot.src,
});

const postTrack = (
  input: HotspotInput,
  frame: BridgeFrame,
  slot: Slot
): void => {
  postToFrame(frame, {
    links: toSlotQueries(input.props, slot),
    type: "track-links",
  });
};

const useShiftKey = (): [boolean, (next: boolean) => void] => {
  const [isHeld, setIsHeld] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Shift") {
        setIsHeld(event.type === "keydown");
      }
    };

    const onBlur = (): void => setIsHeld(false);
    globalThis.addEventListener("keydown", onKey, true);
    globalThis.addEventListener("keyup", onKey, true);
    globalThis.addEventListener("blur", onBlur);

    return (): void => {
      globalThis.removeEventListener("keydown", onKey, true);
      globalThis.removeEventListener("keyup", onKey, true);
      globalThis.removeEventListener("blur", onBlur);
    };
  }, []);

  return [isHeld, setIsHeld];
};

const useStoredHints = (
  projectId: string
): [boolean, (next: boolean) => void] => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() =>
    toStoredHints(readStored(toHotspotKey(projectId)))
  );

  const setEnabled = useCallback(
    (next: boolean): void => {
      setIsEnabled(next);

      if (next) {
        removeStored(toHotspotKey(projectId));

        return;
      }

      writeStored(toHotspotKey(projectId), HOTSPOT_OFF);
    },
    [projectId]
  );

  return [isEnabled, setEnabled];
};

const useHotspotHints = (input: HotspotInput): HotspotHints => {
  const { slots } = input;
  const [isEnabled, setEnabled] = useStoredHints(input.props.projectId);
  const [isShift, setShift] = useShiftKey();
  const [reports, setReports] = useState<Record<string, LinkRectReport[]>>({});
  const [flash, setFlash] = useState<HotspotFlash | null>(null);
  const latest = useLatest(input);

  useBridge(
    () => latest.current.slots.map((slot) => toHintFrame(latest.current, slot)),
    (frame, message: BridgeToParent) => {
      const slot = latest.current.slots.find(
        (item) => item.token === frame.token
      );

      if (!slot) {
        return;
      }

      if (message.type === "ready") {
        postTrack(latest.current, frame, slot);
      }

      if (message.type === "link-rects") {
        setReports((prev) => ({ ...prev, [frame.token]: message.links }));
      }

      if (message.type === "play-shift") {
        setShift(message.isHeld);
      }

      if (
        message.type === "play-miss" &&
        slot === latest.current.slots.at(-1)
      ) {
        setFlash((prev) => ({
          count: (prev?.count ?? 0) + 1,
          token: slot.token,
        }));
      }
    }
  );

  useEffect(() => {
    if (!flash) {
      return;
    }

    const timer = globalThis.setTimeout(() => setFlash(null), FLASH_MS);

    return (): void => globalThis.clearTimeout(timer);
  }, [flash]);

  const shownToken = slots.at(-1)?.token ?? null;

  const spots: Record<string, readonly Rect[]> = {};
  const isHeld = isShift;
  const isFlashing = isEnabled && flash?.token === shownToken;

  if (shownToken && (isHeld || isFlashing)) {
    spots[shownToken] = toHotspotRects(reports[shownToken] ?? []);
  }

  return {
    flashCount: flash?.count ?? 0,
    isEnabled,
    isHeld,
    setEnabled,
    spots,
  };
};

export { useHotspotHints };

export type { HotspotHints };
