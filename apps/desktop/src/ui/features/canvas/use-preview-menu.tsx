import { lazy, Suspense, useCallback, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import type {
  ProjectKind,
  SelectionContext,
  SelectMove,
  ZoomKey,
} from "../../../shared/actions/_core/contracts.js";
import { TRY_VARIANTS_COMMAND } from "../../../shared/actions/_core/element-variants.js";
import {
  commandBlocker,
  IconSlot,
  ImageGenerateSlot,
  ImageSearchMount,
  runCommand,
  useIconHost,
  useImageSearchHost,
} from "../../canvas-preview-slots.js";
import type { GenerateTabProps } from "../../canvas-preview-slots.js";
import type { PreviewPort } from "../../platform/bridge.js";
import { uiStore } from "../../platform/storage.js";
import { formatCopyCss } from "../inspector/authored-css.js";
import { pasteJsx } from "../inspector/paste-jsx.js";
import {
  selectionTargets,
  structureMenuItems,
} from "../inspector/structure-edits.js";
import { requestAuthoredCss } from "../inspector/use-authored-css.js";
import type { LayerEdits } from "../versions-layers-tokens/use-layer-edits.js";
import { PreviewMenu } from "./preview-menu.js";
import type { PreviewMenuItem } from "./preview-menu.js";

const renderGenerateTab = (props: GenerateTabProps) => (
  <ImageGenerateSlot
    directionId={props.directionId}
    projectId={props.projectId}
    target={props.target}
    onDone={props.onDone}
  />
);

const CreateComponentDialog = lazy(async () => {
  const loaded = await import("../design-system/create-component-dialog.js");

  return { default: loaded.CreateComponentDialog };
});

interface Options {
  selection: SelectionContext[];
  port: MutableRefObject<PreviewPort | null> | undefined;
  selectRelative: (selector: string, move: SelectMove) => void;
  zoom: (key: ZoomKey) => void;
  edits: Pick<
    LayerEdits,
    "enabled" | "structureKey" | "canPaste" | "busy" | "notify"
  >;
  ids: { projectId: string; directionId: string | null; kind: ProjectKind };
}

async function copyCss(
  port: PreviewPort | null,
  selector: string
): Promise<void> {
  const css = await requestAuthoredCss(port, selector);

  if (css) {
    await navigator.clipboard.writeText(formatCopyCss(css)).catch(() => null);
  }
}

function structureItems(o: Options): PreviewMenuItem[] {
  const { edits } = o;

  if (!edits.enabled) {
    return [];
  }

  const state = {
    busy: edits.busy,
    canPaste: edits.canPaste,
    count: o.selection.length,
    hasSource: selectionTargets(o.selection) !== null,
  };

  return structureMenuItems(state, edits.structureKey, true);
}

function pasteItem(o: Options, target: SelectionContext): PreviewMenuItem[] {
  if (!o.edits.enabled || !o.ids.directionId) {
    return [];
  }

  const blocked =
    !target.source && !target.owners?.length
      ? "This element has no source location"
      : o.edits.busy
        ? "Wait for the last edit to finish"
        : null;

  const ids = { directionId: o.ids.directionId, projectId: o.ids.projectId };

  return [
    {
      divider: true,
      icon: "code",
      id: "paste-jsx",
      label: "Paste JSX or Figma",
      run: () => pasteJsx(ids, target, o.edits.notify),
      ...disabledBy(blocked),
    },
  ];
}

function createItem(o: Options, open: () => void): PreviewMenuItem[] {
  if (!o.edits.enabled || !o.ids.directionId) {
    return [];
  }

  const blocked = createBlocker(o);

  const label =
    o.selection.length > 1
      ? `Create component from ${o.selection.length}…`
      : "Create component…";

  return [
    {
      icon: "component",
      id: "create-component",
      label,
      run: open,
      ...disabledBy(blocked),
    },
  ];
}

function createBlocker(o: Options): string | null {
  if (o.ids.kind !== "react") {
    return "Components need a React project. This is a plain HTML page";
  }

  if (o.selection.some((item) => !item.source && !item.owners?.length)) {
    return "An element has no source location";
  }

  return o.edits.busy ? "Wait for the last edit to finish" : null;
}

function disabledBy(reason: string | null): { disabled?: string } {
  return reason ? { disabled: reason } : {};
}

function menuItems(
  o: Options,
  target: SelectionContext,
  openCreate: () => void,
  iconItems: (target: SelectionContext) => PreviewMenuItem[]
): PreviewMenuItem[] {
  return [
    {
      icon: "chat",
      id: "ask",
      label: "Ask the agent about this",
      run: () =>
        void (
          runCommand("selection.ask-inline") ||
          runCommand("panel.focus-composer")
        ),
    },
    {
      icon: "compare",
      id: "variants",
      label: "Try variants…",
      run: () => void runCommand(TRY_VARIANTS_COMMAND),
      ...disabledBy(commandBlocker(TRY_VARIANTS_COMMAND)),
    },
    {
      icon: "pointer",
      id: "parent",
      keyId: "select-parent",
      label: "Select parent",
      run: () => o.selectRelative(target.selector, "parent"),
    },
    {
      icon: "pointer",
      id: "child",
      keyId: "select-child",
      label: "Select child",
      run: () => o.selectRelative(target.selector, "child"),
    },
    {
      icon: "copy",
      id: "copy-css",
      label: "Copy CSS",
      run: () => copyCss(o.port?.current ?? null, target.selector),
    },
    {
      icon: "search",
      id: "zoom",
      keyId: "zoom-selection",
      label: "Zoom to selection",
      run: () => o.zoom("selection"),
    },
    {
      icon: "layers",
      id: "layers",
      keyId: "layers",
      label: "Show in layers",
      run: () => uiStore.set({ layersOpen: true }),
    },
    ...structureItems(o),
    ...pasteItem(o, target),
    ...iconItems(target),
    ...createItem(o, openCreate),
  ];
}

export function usePreviewMenu(o: Options) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const latest = useRef(o);
  latest.current = o;

  const onContextMenu = useCallback(
    (point: { x: number; y: number }) => setAt(point),
    []
  );

  const close = useCallback(() => setAt(null), []);
  const [creating, setCreating] = useState<SelectionContext[] | null>(null);
  const target = o.selection.at(-1);
  const openCreate = () => setCreating(latest.current.selection);
  const { directionId } = o.ids;

  const hostOptions = {
    busy: o.edits.busy,
    directionId,
    enabled: o.edits.enabled,
    notify: o.edits.notify,
    projectId: o.ids.projectId,
    selection: o.selection,
  };

  const icons = useIconHost(hostOptions);
  const photos = useImageSearchHost(hostOptions);

  const dialog =
    creating && directionId ? (
      <Suspense fallback={null}>
        <CreateComponentDialog
          ids={{ directionId, projectId: o.ids.projectId }}
          selection={creating}
          onDone={o.edits.notify}
          onClose={() => setCreating(null)}
        />
      </Suspense>
    ) : null;

  const items =
    at && target
      ? menuItems(latest.current, target, openCreate, (item) => [
          ...icons.items(item),
          ...photos.items(item),
        ])
      : [];

  const menu = (
    <>
      {at && target ? (
        <PreviewMenu
          at={at}
          label={`Actions for ${target.tag}`}
          items={items}
          onClose={close}
        />
      ) : null}
      {dialog}
      {icons.opened && directionId ? (
        <IconSlot
          projectId={o.ids.projectId}
          directionId={directionId}
          mode={icons.opened.mode}
          target={icons.opened.target}
          onClose={icons.close}
          onDone={o.edits.notify}
        />
      ) : null}
      <ImageSearchMount
        directionId={directionId}
        host={photos}
        projectId={o.ids.projectId}
        renderGenerate={renderGenerateTab}
        onDone={o.edits.notify}
      />
    </>
  );

  return { menu, onContextMenu };
}
