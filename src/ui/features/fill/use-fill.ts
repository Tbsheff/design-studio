import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { MutableRefObject } from "react";

import { copy } from "./copy.js";
import { api, insertError } from "./deps.js";
import type { FillInfo, PreviewPort, SelectionContext } from "./deps.js";
import {
  bodyOf,
  CLEAR_STYLE,
  draftOf,
  previewStyle,
  sameDraft,
} from "./fill-model.js";
import type { FillDraft, PreviewStyle } from "./fill-model.js";
import { useFillInfo } from "./use-fill-info.js";
import type { FillIds } from "./use-fill-info.js";

interface FillNote {
  readonly kind: "error" | "ok";
  readonly text: string;
}

interface FillView {
  readonly dirty: boolean;
  readonly draft: FillDraft;
  readonly loading: boolean;
  readonly note: FillNote | null;
  readonly pending: boolean;
  readonly onApply: () => void;
  readonly onDraft: (next: FillDraft) => void;
  readonly onReset: () => void;
}

type PortRef = MutableRefObject<PreviewPort | null>;

interface FillScope {
  readonly fallback: string;
  readonly port: PortRef;
  readonly target: SelectionContext;
}

interface Edited {
  readonly base: FillInfo | null;
  readonly draft: FillDraft;
}

const noteOf = (
  own: FillNote | null,
  error: string | null
): FillNote | null => {
  if (own) {
    return own;
  }

  if (error === null) {
    return null;
  }

  return { kind: "error", text: error };
};

const draftNow = (
  edited: Edited | null,
  info: FillInfo | null,
  base: FillDraft
): FillDraft => {
  if (edited && edited.base === info) {
    return edited.draft;
  }

  return base;
};

const postStyle = (
  port: PortRef,
  selector: string,
  style: PreviewStyle
): void => {
  const frame = port.current;

  frame?.post({
    selector,
    style: Object.fromEntries(Object.entries(style)),
    type: "preview-style",
  });
};

const useClearOnLeave = (
  dirty: boolean,
  port: PortRef,
  selector: string
): void => {
  const dirtyRef = useRef(dirty);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(
    () => (): void => {
      if (dirtyRef.current) {
        postStyle(port, selector, CLEAR_STYLE);
      }
    },
    [port, selector]
  );
};

const useFill = (ids: FillIds, scope: FillScope): FillView => {
  const { fallback, port, target } = scope;
  const { selector } = target;
  const [round, setRound] = useState(0);
  const loaded = useFillInfo(ids, target.source, round);
  const [edited, setEdited] = useState<Edited | null>(null);
  const [own, setOwn] = useState<FillNote | null>(null);
  const [pending, startTransition] = useTransition();
  const { info } = loaded;

  const base = useMemo(() => draftOf(info, fallback), [fallback, info]);
  const draft = draftNow(edited, info, base);
  const dirty = !sameDraft(draft, base);

  useClearOnLeave(dirty, port, selector);

  const onDraft = useCallback(
    (next: FillDraft): void => {
      setEdited({ base: info, draft: next });
      setOwn(null);
      postStyle(port, selector, { ...CLEAR_STYLE, ...previewStyle(next) });
    },
    [info, port, selector]
  );

  const onReset = useCallback((): void => {
    setEdited(null);
    setOwn(null);
    postStyle(port, selector, CLEAR_STYLE);
  }, [port, selector]);

  const onApply = useCallback((): void => {
    const loc = target.source;

    if (!loc) {
      return;
    }

    startTransition(async () => {
      try {
        await api.setFill(ids.projectId, ids.directionId, {
          fill: bodyOf(draft),
          target: { selector: target.selector, source: loc, tag: target.tag },
        });
        setOwn({ kind: "ok", text: copy.applied });
        setRound((count) => count + 1);
      } catch (error) {
        setOwn({ kind: "error", text: insertError(error) });
      }
    });
  }, [draft, ids, target]);

  const { loading } = loaded;
  const note = noteOf(own, loaded.error);

  return {
    dirty,
    draft,
    loading,
    note,
    onApply,
    onDraft,
    onReset,
    pending,
  };
};

export { useFill };

export type { FillNote, FillView };
