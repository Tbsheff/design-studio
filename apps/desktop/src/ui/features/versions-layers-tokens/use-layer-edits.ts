import type {
  BridgeToParent,
  ReorderMove,
  SelectionContext,
  StructureEditRequest,
  StructureKey,
} from "@design-studio/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { shortcutLabel } from "../../../shared/keymap.js";
import { api, errorText } from "../../api.js";
import { useBridge } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import { IS_MAC } from "../commands/index.js";
import { pasteJsx } from "../inspector/paste-jsx.js";
import {
  NO_SOURCE,
  dropRequest,
  selectionTargets,
} from "../inspector/structure-edits.js";
import type { LayerDrop, SelectionOp } from "../inspector/structure-edits.js";
import { COPY } from "./copy.js";
import { handleLayerBridge } from "./layer-bridge-model.js";
import type { LayerBridgeContext } from "./layer-bridge-model.js";
import {
  toCutNotice,
  toDirectEditRequest,
  toPreviewStyle,
  toLocKey,
  withOverrides,
} from "./layer-edits-model.js";
import type {
  CutState,
  LayerChange,
  LayerEdits,
  LayerEditsOptions,
  Reselect,
} from "./layer-edits-types.js";
import { useLatest } from "./use-latest.js";
import { useLayerLocks } from "./use-layer-locks.js";
import { useLayerShortcuts } from "./use-layer-shortcuts.js";
import { useNodeTask } from "./use-node-task.js";
import { useNotice } from "./use-notice.js";

const RESELECT_MS = 5000;

export function useLayerEdits(o: LayerEditsOptions): LayerEdits {
  const live = useRef(o);
  live.current = o;
  const { notice, notify, clearNotice } = useNotice();
  const [inflight, setInflight] = useState(false);
  const busyRef = useRef(false);

  const releaseBusy = useCallback(() => {
    busyRef.current = false;
    setInflight(false);
  }, []);

  const reselect = useRef<Reselect | null>(null);
  const [reselecting, setReselecting] = useState(false);
  const [names, setNames] = useState<Map<number, string>>(() => new Map());
  const [hidden, setHidden] = useState<Map<number, boolean>>(() => new Map());
  const [treeToken, setTreeToken] = useState<string | null>(null);
  const treeFresh = treeToken !== null && treeToken === o.frames.frontToken;
  const treeFreshRef = useRef(treeFresh);
  treeFreshRef.current = treeFresh;

  const locks = useLayerLocks(
    o.projectId,
    o.directionId,
    o.frames.frontToken,
    o.frames.post
  );

  useEffect(() => {
    if (o.treeWanted && o.frames.frontToken) {
      o.frames.post({ type: "request-tree" });
    }
  }, [o.treeWanted, o.frames.frontToken, o.frames.post]);

  useEffect(() => {
    setNames(new Map());
    setHidden(new Map());
  }, [o.frames.tree]);

  const expire = useCallback(
    (pending: Reselect) => {
      if (reselect.current !== pending) {
        return;
      }
      reselect.current = null;
      setReselecting(false);

      if (!pending.move) {
        return;
      }
      live.current.setSelection(() => []);
      notify(COPY.noticeSelectAgain);
    },
    [notify]
  );

  const sendReselect = useCallback(() => {
    const pending = reselect.current;
    const cur = live.current;

    if (!pending) {
      return;
    }
    if (Date.now() > pending.until) {
      expire(pending);

      return;
    }

    if (pending.newFrame && cur.frames.frontToken === pending.token) {
      return;
    }
    cur.frames.post({
      sourceLoc: pending.loc,
      tag: pending.tag,
      text: pending.move ? pending.text : "",
      type: "select-source",
    });
  }, [expire]);

  const resolveReselect = useCallback(
    (token: string, selection: SelectionContext) => {
      const pending = reselect.current;

      if (
        !pending ||
        !selection.source ||
        toLocKey(selection.source) !== pending.loc
      ) {
        return;
      }
      if (pending.newFrame && token === pending.token) {
        return;
      }
      reselect.current = null;
      setReselecting(false);
    },
    []
  );

  useEffect(() => {
    const pending = reselect.current;
    const last = o.selection.at(-1);

    if (!pending) {
      return;
    }
    if (!last || last.selector !== pending.fromSelector) {
      reselect.current = null;
      setReselecting(false);
    }
  }, [o.selection]);

  useEffect(sendReselect, [o.frames.frontToken, sendReselect]);

  const beginReselect = useCallback(
    (next: Omit<Reselect, "until" | "newFrame">) => {
      const pending: Reselect = {
        ...next,
        newFrame: live.current.kind === "html",
        until: Date.now() + RESELECT_MS,
      };

      reselect.current = pending;
      setReselecting(true);
      globalThis.setTimeout(() => expire(pending), RESELECT_MS);
      sendReselect();
    },
    [expire, sendReselect]
  );

  const applyStructure = useCallback(
    async (request: StructureEditRequest) => {
      const cur = live.current;

      if (
        !cur.enabled ||
        !cur.directionId ||
        busyRef.current ||
        reselect.current?.move
      ) {
        return;
      }
      busyRef.current = true;
      reselect.current = null;
      setInflight(true);
      const token = cur.frames.frontToken;
      const head = cur.headVersionId;

      try {
        const result = await api.structureEdit(
          cur.projectId,
          cur.directionId,
          request
        );

        if (result.version.id === head) {
          return;
        }
        const first = result.select[0];

        if (!first) {
          live.current.setSelection(() => []);

          return;
        }

        beginReselect({
          fromSelector: live.current.selection.at(-1)?.selector ?? "",
          loc: toLocKey(first),
          move: true,
          tag: first.tag,
          text: "",
          token,
        });
      } catch (error) {
        notify(errorText(error));
      } finally {
        releaseBusy();
      }
    },
    [notify, beginReselect, releaseBusy]
  );

  const [cut, setCut] = useState<CutState | null>(null);

  const runOp = useCallback(
    (op: SelectionOp) => {
      const targets = selectionTargets(live.current.selection);

      if (targets) {
        void applyStructure({ op, targets });
      } else {
        notify(NO_SOURCE);
      }
    },
    [applyStructure, notify]
  );

  const cutSelection = useCallback(() => {
    const targets = selectionTargets(live.current.selection);

    if (!targets) {
      return notify(NO_SOURCE);
    }
    setCut({ head: live.current.headVersionId, targets });
    notify(toCutNotice(targets.length, shortcutLabel("layer-paste", IS_MAC)));
  }, [notify]);

  const pasteInto = useCallback(() => {
    const cur = live.current;
    const into = selectionTargets(cur.selection.slice(-1))?.[0];
    const last = cur.selection.at(-1);

    if (!cut && cur.enabled && cur.directionId && last) {
      return void pasteJsx(
        { projectId: cur.projectId, directionId: cur.directionId },
        last,
        notify
      );
    }
    if (!cut) {
      return notify(
        `Cut a layer first (${shortcutLabel("layer-cut", IS_MAC)}), then select where it goes.`
      );
    }
    if (!into) {
      return notify(NO_SOURCE);
    }
    setCut(null);

    if (cut.head !== live.current.headVersionId) {
      return notify(COPY.noticeChangedAfterCut);
    }
    void applyStructure({ into, op: "move", targets: cut.targets });
  }, [cut, applyStructure, notify]);

  const structureKey = useCallback(
    (key: StructureKey) => {
      if (key === "cut") {
        cutSelection();
      } else if (key === "paste") {
        pasteInto();
      } else {
        runOp(key);
      }
    },
    [cutSelection, pasteInto, runOp]
  );

  const dropNode = useCallback(
    (id: number, drop: LayerDrop) => {
      const request = dropRequest(
        live.current.frames.tree?.nodes ?? [],
        id,
        drop,
        live.current.selection
      );

      if (request) {
        void applyStructure(request);
      } else {
        notify(NO_SOURCE);
      }
    },
    [applyStructure, notify]
  );

  const apply = useCallback(
    async (
      target: SelectionContext,
      change: LayerChange,
      nodeId: number | null = null
    ) => {
      const cur = live.current;

      if (!cur.enabled || !cur.directionId || busyRef.current) {
        return;
      }
      if (!target.source) {
        notify(COPY.noticeNoSource);

        return;
      }

      busyRef.current = true;
      reselect.current = null;
      setInflight(true);

      if ("hidden" in change) {
        cur.frames.post(toPreviewStyle(target.selector, change.hidden));
      }
      const token = cur.frames.frontToken;
      const head = cur.headVersionId;

      try {
        const result = await api.directEdit(
          cur.projectId,
          cur.directionId,
          toDirectEditRequest(target, target.source, change)
        );

        const move = "move" in change;

        if (result.version.id === head) {
          if (nodeId !== null) {
            setHidden((prev) => (prev.delete(nodeId) ? new Map(prev) : prev));
          }
          if ("hidden" in change && !change.hidden) {
            notify(COPY.noticeHiddenElsewhere);
          }
          return;
        }

        const { moved } = result;

        if (moved) {
          live.current.setSelection((prev) =>
            prev.map((s) =>
              s.selector === target.selector ? { ...s, source: moved } : s
            )
          );
        }
        beginReselect({
          fromSelector: target.selector,
          loc: toLocKey(result.moved ?? target.source),
          move,
          tag: target.tag.toLowerCase(),
          text: target.text,
          token,
        });
      } catch (error) {
        if ("hidden" in change)
          cur.frames.post(toPreviewStyle(target.selector, !change.hidden));
        notify(errorText(error));
      } finally {
        releaseBusy();
      }
    },
    [notify, beginReselect, releaseBusy]
  );

  const getOptions = useCallback(() => live.current, []);
  const isTreeFresh = useCallback(() => treeFreshRef.current, []);

  const forNode = useNodeTask({
    getOptions,
    isTreeFresh,
    selectedNode: o.frames.selectedNode,
    selection: o.selection,
  });

  const movesBlocked = () => busyRef.current || reselect.current?.move === true;

  const moveSelected = useCallback(
    (move: ReorderMove) => {
      const last = live.current.selection.at(-1);

      if (!last || movesBlocked()) {
        return;
      }
      void apply(last, { move });
    },
    [apply]
  );

  const renameNode = useCallback(
    (id: number, name: string | null) => {
      if (name !== null) {
        setNames((prev) => new Map(prev).set(id, name));
      }
      forNode(id, (target) => void apply(target, { name }));
    },
    [apply, forNode]
  );

  const setNodeHidden = useCallback(
    (id: number, value: boolean) => {
      setHidden((prev) => new Map(prev).set(id, value));
      forNode(id, (target) => void apply(target, { hidden: value }, id));
    },
    [apply, forNode]
  );

  const moveNode = useCallback(
    (id: number, move: ReorderMove) => {
      if (movesBlocked()) {
        return;
      }
      forNode(id, (target) => void apply(target, { move }));
    },
    [apply, forNode]
  );

  const bridgeContext: LayerBridgeContext = {
    getOptions,
    moveSelected,
    onBridge: locks.onBridge,
    resolveReselect,
    sendReselect,
    setTreeToken,
    structureKey: (key) => structureKeyRef.current(key),
  };

  useBridge(
    () =>
      live.current.frames.slots.map((slot): BridgeFrame => ({
        element: live.current.frames.elements.current[slot.token] ?? null,
        key: slot.token,
        kind: live.current.kind,
        token: slot.token,
        url: slot.src,
      })),
    (frame, message: BridgeToParent) =>
      handleLayerBridge(bridgeContext, frame, message)
  );

  const structureKeyRef = useRef(structureKey);
  structureKeyRef.current = structureKey;
  useLayerShortcuts({
    getOptions,
    isMac: IS_MAC,
    onMove: moveSelected,
    onStructureKey: useLatest(structureKey),
  });

  const tree = useMemo(
    () => withOverrides(o.frames.tree, names, hidden),
    [o.frames.tree, names, hidden]
  );

  return {
    applyStructure,
    busy: inflight || reselecting,
    canPaste: cut !== null,
    clearNotice,
    dropNode,
    enabled: o.enabled,
    moveNode,
    moveSelected,
    notice,
    notify,
    renameNode,
    setNodeHidden,
    setNodeLocked: locks.setNodeLocked,
    settled: !inflight && !reselecting && treeFresh,
    structureKey,
    tree,
  };
}

export type { LayerEdits, LayerFrames } from "./layer-edits-types.js";
