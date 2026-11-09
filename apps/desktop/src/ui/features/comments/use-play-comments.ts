import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import { toBridgeFrame } from "./anchor-frames-model.js";
import type { FrameSet } from "./comment-layer-types.js";
import type { DescribeAnchors } from "./comments-control.js";
import { postToFrame, useBridge } from "./deps.js";
import type { PlayCommentInput } from "./deps.js";
import type { CommentsControl } from "./use-comments.js";
import { useLatest, writeRef } from "./use-latest.js";

interface PlayComments {
  readonly control: CommentsControl;
  readonly frames: FrameSet;
}

type Describe = CommentsControl["describeRef"];

const bridgeOrigins = new WeakMap<DescribeAnchors, DescribeAnchors | null>();

const toOrigin = (current: DescribeAnchors | null): DescribeAnchors | null => {
  if (current && bridgeOrigins.has(current)) {
    return bridgeOrigins.get(current) ?? null;
  }

  return current;
};

const useScopedControl = (
  control: CommentsControl,
  own: Describe
): CommentsControl =>
  useMemo(
    () => ({
      ...control,
      describeRef: own,
      update: (id, patch) => {
        if (patch.status === "orphaned") {
          return Promise.resolve();
        }

        return control.update(id, patch);
      },
    }),
    [control, own]
  );

const restoreDescribe = (
  describeRef: Describe,
  bridge: DescribeAnchors,
  origin: DescribeAnchors | null
): void => {
  queueMicrotask(() => {
    if (describeRef.current === bridge) {
      writeRef(describeRef, origin);
    }
  });
};

const useDescribeBridge = (
  isActive: boolean,
  describeRef: Describe,
  own: Describe
): void => {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const origin = toOrigin(describeRef.current);

    const bridge: DescribeAnchors = (queries) =>
      own.current?.(queries) ?? Promise.resolve([]);

    bridgeOrigins.set(bridge, origin);
    writeRef(describeRef, bridge);

    return (): void => restoreDescribe(describeRef, bridge, origin);
  }, [describeRef, isActive, own]);
};

const useFrameNote = (input: PlayCommentInput): void => {
  const { control, frame, isActive } = input;
  const { frameRef } = control;

  useLayoutEffect(() => {
    if (isActive) {
      writeRef(frameRef, {
        id: frame.id,
        label: frame.label ?? "",
        path: frame.path ?? "",
      });
    }
  });
};

const usePostMode = (
  input: PlayCommentInput,
  frames: FrameSet
): ((mode: "none" | "select") => void) => {
  const { kind, token } = input;
  const live = useLatest({ frames, kind, token });

  return useCallback(
    (mode: "none" | "select"): void => {
      const { current } = live;
      const target = toBridgeFrame(current.frames, current.kind, current.token);

      if (target) {
        const marquee = false;

        postToFrame(target, { marquee, mode, type: "set-mode" });
      }
    },
    [live]
  );
};

const useModeFollow = (input: PlayCommentInput, frames: FrameSet): void => {
  const { isOn, kind, onExit, token } = input;
  const { setOpenId } = input.control;
  const postMode = usePostMode(input, frames);
  const live = useLatest({ isOn, onExit });

  useEffect(() => {
    if (!isOn) {
      return;
    }

    postMode("select");

    return (): void => {
      postMode("none");
      setOpenId(null);
    };
  }, [isOn, postMode, setOpenId]);

  useBridge(
    () => {
      const found = toBridgeFrame(frames, kind, token);

      if (found) {
        return [found];
      }

      return [];
    },
    (source, message) => {
      if (source.token !== token || !live.current.isOn) {
        return;
      }

      if (message.type === "ready") {
        postMode("select");
      }

      if (message.type === "mode-exited") {
        live.current.onExit();
      }
    }
  );
};

const usePlayComments = (input: PlayCommentInput): PlayComments => {
  const own = useRef<DescribeAnchors | null>(null);
  const control = useScopedControl(input.control, own);
  const { elements, src, token } = input;

  const frames = useMemo(
    (): FrameSet => ({
      elements,
      frontToken: token,
      slots: [{ src, token }],
    }),
    [elements, src, token]
  );

  useDescribeBridge(input.isActive, input.control.describeRef, own);
  useFrameNote(input);
  useModeFollow(input, frames);

  return { control, frames };
};

export { usePlayComments };

export type { PlayComments };
