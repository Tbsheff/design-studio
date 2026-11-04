import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import type {
  CanvasFrame,
  LinkAction,
  LinkInteractionChange,
  LinkTriggerKind,
  LinkVisibility,
  PrototypeLink,
} from "./deps.js";
import {
  NO_PENDING,
  actionChange,
  pendingFor,
  triggerChange,
} from "./interaction-model.js";
import type { Pending, PendingKind } from "./interaction-model.js";
import { saveChange } from "./save-change.js";
import { usePickWatch } from "./use-pick-watch.js";

type ChangeBody = Omit<LinkInteractionChange, "linkId">;

interface InteractionHost {
  readonly frames: readonly CanvasFrame[];
  readonly link: PrototypeLink;
  readonly onError: (message: string) => void;
  readonly onPicking: (isPicking: boolean) => void;
  readonly picked: string | null;
  readonly projectId: string;
}

interface Interaction {
  readonly handleAction: (action: LinkAction) => void;
  readonly handleCancel: () => void;
  readonly handleKey: (key: string) => void;
  readonly handleSend: (change: ChangeBody) => void;
  readonly handleStart: (kind: PendingKind) => void;
  readonly handleTarget: (target: string) => void;
  readonly handleTrigger: (trigger: LinkTriggerKind) => void;
  readonly handleUrl: (url: string) => void;
  readonly handleVisibility: (visibility: LinkVisibility) => void;
  readonly isSaving: boolean;
  readonly pending: Pending;
}

interface Saver {
  readonly isSaving: boolean;
  readonly ref: { readonly current: InteractionHost };
  readonly save: (change: LinkInteractionChange | null) => void;
}

interface ValueHandlers {
  readonly handleKey: (key: string) => void;
  readonly handleTarget: (target: string) => void;
  readonly handleUrl: (url: string) => void;
  readonly handleVisibility: (visibility: LinkVisibility) => void;
}

const useSaver = (host: InteractionHost): Saver => {
  const [isSaving, startSaving] = useTransition();
  const ref = useRef(host);

  useLayoutEffect(() => {
    ref.current = host;
  });

  const save = useCallback((change: LinkInteractionChange | null): void => {
    if (change) {
      startSaving(async () => {
        await saveChange(ref.current, change);
      });
    }
  }, []);

  return { isSaving, ref, save };
};

const useValueHandlers = (
  pendingAction: LinkAction | null,
  handleSend: (change: ChangeBody) => void
): ValueHandlers => {
  const withAction = useCallback(
    (change: ChangeBody): void => {
      if (pendingAction === null) {
        handleSend(change);

        return;
      }

      handleSend({ ...change, action: pendingAction });
    },
    [handleSend, pendingAction]
  );

  const handleTarget = useCallback(
    (target: string): void => withAction({ target }),
    [withAction]
  );

  const handleUrl = useCallback(
    (url: string): void => withAction({ url }),
    [withAction]
  );

  const handleKey = useCallback(
    (key: string): void => handleSend({ key, trigger: "key" }),
    [handleSend]
  );

  const handleVisibility = useCallback(
    (visibility: LinkVisibility): void =>
      handleSend({ action: "toggle", visibility }),
    [handleSend]
  );

  return { handleKey, handleTarget, handleUrl, handleVisibility };
};

const useLinkInteraction = (host: InteractionHost): Interaction => {
  const [pending, setPending] = useState<Pending>(NO_PENDING);
  const { isSaving, ref, save } = useSaver(host);
  const pendingAction = pending.action;

  const handleSend = useCallback(
    (change: ChangeBody): void => {
      setPending(NO_PENDING);
      save({ ...change, linkId: ref.current.link.id });
    },
    [ref, save]
  );

  const { handleKey, handleTarget, handleUrl, handleVisibility } =
    useValueHandlers(pendingAction, handleSend);

  usePickWatch({
    isPicking: pending.kind === "pick",
    onPicked: handleTarget,
    onPicking: host.onPicking,
    picked: host.picked,
  });

  const handleAction = useCallback(
    (action: LinkAction): void => {
      const { frames, link } = ref.current;
      const next = pendingFor(link, action);

      setPending(next);

      if (next.kind === null) {
        save(actionChange(link, action, frames));
      }
    },
    [ref, save]
  );

  const handleStart = useCallback(
    (kind: PendingKind): void => setPending({ action: pendingAction, kind }),
    [pendingAction]
  );

  const handleTrigger = useCallback(
    (trigger: LinkTriggerKind): void => {
      if (trigger === "key") {
        handleStart("key");

        return;
      }

      save(triggerChange(ref.current.link, trigger));
    },
    [handleStart, ref, save]
  );

  const handleCancel = useCallback((): void => setPending(NO_PENDING), []);

  return {
    handleAction,
    handleCancel,
    handleKey,
    handleSend,
    handleStart,
    handleTarget,
    handleTrigger,
    handleUrl,
    handleVisibility,
    isSaving,
    pending,
  };
};

export { useLinkInteraction };

export type { ChangeBody, Interaction, InteractionHost };
