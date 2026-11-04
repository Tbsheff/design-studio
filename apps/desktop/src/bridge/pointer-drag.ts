import { SOURCE_LOC_ATTR } from "@design-studio/contracts";

import { appSourceFor, componentUseOf } from "./app-source.js";
import type { BridgeContext, BridgeCore } from "./bridge-types.js";
import { eventElement, holdTextSelection } from "./dom-input.js";
import {
  parseLoc,
  rectOf,
  selectionFor,
  selectorFor,
  shortLabel,
  usedAtOf,
} from "./element-info.js";
import { createFreeMove } from "./free-move.js";
import { dropElement, insideTarget } from "./insert-target.js";
import { createMarquee } from "./marquee.js";
import { APP_MODE } from "./session.js";

type PointerTools = Pick<BridgeContext, "block" | "freeMove" | "marquee">;

const createPointerTools = (core: BridgeCore): PointerTools => {
  const { state, post, textEditor, locks } = core;

  const block = (event: Event): void => {
    if (textEditor.owns(eventElement(event))) {
      event.stopImmediatePropagation();

      return;
    }

    if (event.type === "pointerdown") {
      textEditor.commit();
    }

    if (state.mode !== "select") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };

  const marquee = createMarquee({
    enabled: () =>
      state.mode === "select" && state.isMarqueeOn && !textEditor.editing(),
    locked: (element) => locks.isLocked(element),
    pick: (elements, additive) => void core.postSelectMany(elements, additive),
    show: (rect) => {
      if (rect && state.lastHover) {
        state.lastHover = null;
        post({ rect: null, type: "hover" });
      }

      post({ rect, type: "marquee" });
    },
  });

  const freeMove = createFreeMove({
    enabled: () => state.mode === "select" && !textEditor.editing(),
    ownSource: async (element) => {
      let value = element.getAttribute(SOURCE_LOC_ATTR);
      let usedAt: ReturnType<typeof usedAtOf> | null = null;

      if (APP_MODE === "next") {
        value = await appSourceFor(element);

        if (componentUseOf(element)?.root) {
          usedAt = usedAtOf(element);
        }
      }

      return { own: (value && parseLoc(value)) || null, usedAt };
    },
    post,
    promote: (element) => core.postSelect(element, false),
    rectOf,
    selected: () => state.selected,
    selectorFor,
  });

  return { block, freeMove, marquee };
};

const hasFiles = (event: DragEvent): boolean =>
  [...(event.dataTransfer?.types ?? [])].includes("Files");

const installFileDrop = (context: BridgeContext): void => {
  const { post, postHover } = context;

  const onDragOver = (event: DragEvent): void => {
    if (!hasFiles(event)) {
      return;
    }

    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }

    const element = dropElement(event.clientX, event.clientY);

    if (element) {
      postHover(element);
    }
  };

  const onFileDrop = (event: DragEvent): void => {
    if (!hasFiles(event)) {
      return;
    }

    event.preventDefault();

    const files = [...(event.dataTransfer?.files ?? [])]
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 1);

    const element = dropElement(event.clientX, event.clientY);
    post({
      files,
      inside: Boolean(element && insideTarget(element)),
      label: (element && shortLabel(element)) || "",
      rect: element && rectOf(element),
      selection: element && selectionFor(element),
      type: "file-drop",
    });
  };

  window.addEventListener("dragover", onDragOver, { capture: true });
  window.addEventListener("drop", onFileDrop, { capture: true });
};

const installPointerDrag = (context: BridgeContext): void => {
  const { state, textEditor, freeMove, marquee, block, hitOf } = context;

  const onPointerDown = (event: PointerEvent): void => {
    block(event);

    if (textEditor.owns(eventElement(event))) {
      return;
    }

    if (state.mode === "select" && event.button === 0) {
      holdTextSelection(true);
    }

    if (!freeMove.down(event, hitOf(event))) {
      marquee.down(event, hitOf(event));
    }
  };

  const onPointerUp = (event: PointerEvent): void => {
    holdTextSelection(false);

    if (!freeMove.up(event)) {
      marquee.up(event);
    }

    block(event);
  };

  window.addEventListener("pointerdown", onPointerDown, { capture: true });
  window.addEventListener("mousedown", block, { capture: true });
  window.addEventListener("pointerup", onPointerUp, { capture: true });
  window.addEventListener("pointercancel", () => holdTextSelection(false), {
    capture: true,
  });
  window.addEventListener("blur", () => holdTextSelection(false));
  window.addEventListener("mouseup", block, { capture: true });
  window.addEventListener("auxclick", block, { capture: true });
  installFileDrop(context);
};

export { createPointerTools, installPointerDrag };
