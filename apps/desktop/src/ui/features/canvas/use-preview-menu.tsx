import type {
  ProjectKind,
  SelectionContext,
  SelectMove,
  ZoomKey,
} from "@design-studio/contracts";
import { TRY_VARIANTS_COMMAND } from "@design-studio/contracts/element-variants";
import { Suspense, useCallback, useMemo, useState } from "react";
import type { MutableRefObject, ReactElement, ReactNode } from "react";

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
import { CreateComponentDialog } from "../design-system/index.js";
import {
  applyPasteJsx,
  toCopyCss,
  toSelectionTargets,
  toStructureMenuEntries,
} from "../inspector/index.js";
import { getAuthoredCss } from "../inspector/use-authored-css.js";
import { PatternSlot, usePatternHost } from "../pattern/index.js";
import { PropSlot, usePropHost } from "../prop/index.js";
import type { LayerEdits } from "../versions-layers-tokens/use-layer-edits.js";
import { PreviewMenu } from "./preview-menu.js";
import type { PreviewMenuItem } from "./preview-menu.js";
import { toValueOr } from "./settle-model.js";

const renderGenerateTab = (props: GenerateTabProps): ReactElement => (
  <ImageGenerateSlot
    directionId={props.directionId}
    projectId={props.projectId}
    target={props.target}
    onDone={props.onDone}
  />
);

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

const copyCss = async (
  port: PreviewPort | null,
  selector: string
): Promise<void> => {
  const css = await getAuthoredCss(port, selector);

  if (css) {
    await toValueOr(navigator.clipboard.writeText(toCopyCss(css)), null);
  }
};

const structureItems = (options: Options): PreviewMenuItem[] => {
  const { edits } = options;

  if (!edits.enabled) {
    return [];
  }

  const state = {
    canPaste: edits.canPaste,
    count: options.selection.length,
    hasSource: toSelectionTargets(options.selection) !== null,
    isBusy: edits.busy,
  };

  return toStructureMenuEntries(state, edits.structureKey, true);
};

interface DisabledReason {
  disabled?: string;
}

const disabledBy = (reason: string | null): DisabledReason => {
  if (reason) {
    return { disabled: reason };
  }

  return {};
};

const pasteItem = (
  optionsValue: Options,
  target: SelectionContext
): PreviewMenuItem[] => {
  if (!optionsValue.edits.enabled || !optionsValue.ids.directionId) {
    return [];
  }

  const blocked:
    | "This element has no source location"
    | "Wait for the last edit to finish"
    | null = (():
    | "This element has no source location"
    | "Wait for the last edit to finish"
    | null => {
    if (!target.source && !target.owners?.length) {
      return "This element has no source location";
    }

    if (optionsValue.edits.busy) {
      return "Wait for the last edit to finish";
    }

    return null;
  })();

  const ids = {
    directionId: optionsValue.ids.directionId,
    projectId: optionsValue.ids.projectId,
  };

  return [
    {
      divider: true,
      icon: "code",
      id: "paste-jsx",
      label: "Paste JSX or Figma",
      run: () => applyPasteJsx(ids, target, optionsValue.edits.notify),
      ...disabledBy(blocked),
    },
  ];
};

const createBlocker = (options4: Options): string | null => {
  if (options4.ids.kind !== "react") {
    return "Components need a React project. This is a plain HTML page";
  }

  if (options4.selection.some((item) => !item.source && !item.owners?.length)) {
    return "An element has no source location";
  }

  if (options4.edits.busy) {
    return "Wait for the last edit to finish";
  }

  return null;
};

const createItem = (options3: Options, open: () => void): PreviewMenuItem[] => {
  if (!options3.edits.enabled || !options3.ids.directionId) {
    return [];
  }

  const blocked = createBlocker(options3);

  let label = "Create component…";

  if (options3.selection.length > 1) {
    label = `Create component from ${options3.selection.length}…`;
  }

  return [
    {
      icon: "component",
      id: "create-component",
      label,
      run: open,
      ...disabledBy(blocked),
    },
  ];
};

const menuItems = (
  options5: Options,
  target: SelectionContext,
  openCreate: () => void,
  iconItems: (target: SelectionContext) => PreviewMenuItem[]
): PreviewMenuItem[] => [
  {
    icon: "chat",
    id: "ask",
    label: "Ask the agent about this",
    run: () =>
      runCommand("selection.ask-inline") || runCommand("panel.focus-composer"),
  },
  {
    icon: "compare",
    id: "variants",
    label: "Try variants…",
    run: () => runCommand(TRY_VARIANTS_COMMAND),
    ...disabledBy(commandBlocker(TRY_VARIANTS_COMMAND)),
  },
  {
    icon: "pointer",
    id: "parent",
    keyId: "select-parent",
    label: "Select parent",
    run: () => options5.selectRelative(target.selector, "parent"),
  },
  {
    icon: "pointer",
    id: "child",
    keyId: "select-child",
    label: "Select child",
    run: () => options5.selectRelative(target.selector, "child"),
  },
  {
    icon: "copy",
    id: "copy-css",
    label: "Copy CSS",
    run: () => copyCss(options5.port?.current ?? null, target.selector),
  },
  {
    icon: "search",
    id: "zoom",
    keyId: "zoom-selection",
    label: "Zoom to selection",
    run: () => options5.zoom("selection"),
  },
  {
    icon: "layers",
    id: "layers",
    keyId: "layers",
    label: "Show in layers",
    run: () => uiStore.set({ layersOpen: true }),
  },
  ...structureItems(options5),
  ...pasteItem(options5, target),
  ...iconItems(target),
  ...createItem(options5, openCreate),
];

interface CreateIds {
  readonly directionId: string;
  readonly projectId: string;
}

interface MenuHandlers {
  readonly onClose: () => void;
  readonly onCreate: () => void;
}

interface PreviewMenuHandle {
  readonly menu: ReactElement;
  readonly onContextMenu: (point: { x: number; y: number }) => void;
}

interface HostBase {
  readonly busy: boolean;
  readonly directionId: string | null;
  readonly enabled: boolean;
  readonly notify: Options["edits"]["notify"];
  readonly projectId: string;
}

interface MenuHosts {
  readonly icons: ReturnType<typeof useIconHost>;
  readonly photos: ReturnType<typeof useImageSearchHost>;
  readonly props: ReturnType<typeof usePropHost>;
  readonly patterns: ReturnType<typeof usePatternHost>;
}

const toHostBase = (options: Options): HostBase => {
  const { busy, enabled, notify } = options.edits;
  const { directionId, projectId } = options.ids;

  return { busy, directionId, enabled, notify, projectId };
};

const toHostItems = (
  hosts: MenuHosts,
  item: SelectionContext
): PreviewMenuItem[] => [
  ...hosts.icons.items(item),
  ...hosts.photos.items(item),
  ...hosts.props.items(item),
  ...hosts.patterns.items(item),
];

const toCreateDialog = (
  options: Options,
  creating: SelectionContext[] | null,
  ids: CreateIds | null,
  onClose: () => void
): ReactNode => {
  const { notify } = options.edits;

  if (!creating || !ids) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <CreateComponentDialog
        ids={ids}
        selection={creating}
        onDone={notify}
        onClose={onClose}
      />
    </Suspense>
  );
};

const toIconSlot = (options: Options, hosts: MenuHosts): ReactNode => {
  const { directionId, projectId } = options.ids;
  const { opened, close } = hosts.icons;
  const { notify } = options.edits;

  if (!opened || !directionId) {
    return null;
  }

  return (
    <IconSlot
      projectId={projectId}
      directionId={directionId}
      mode={opened.mode}
      target={opened.target}
      onClose={close}
      onDone={notify}
    />
  );
};

const toPropSlot = (options: Options, hosts: MenuHosts): ReactNode => {
  const { opened, close } = hosts.props;
  const { notify } = options.edits;

  if (!opened) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <PropSlot
        isDialog
        layer={opened.layer}
        target={opened.target}
        onClose={close}
        onDone={notify}
      />
    </Suspense>
  );
};

const toPatternSlot = (options: Options, hosts: MenuHosts): ReactNode => {
  const { directionId, projectId } = options.ids;
  const { opened, close } = hosts.patterns;
  const { notify } = options.edits;

  if (!opened || !directionId) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <PatternSlot
        directionId={directionId}
        projectId={projectId}
        target={opened}
        onClose={close}
        onDone={notify}
      />
    </Suspense>
  );
};

const toMenuNode = (
  options: Options,
  hosts: MenuHosts,
  at: { x: number; y: number } | null,
  handlers: MenuHandlers
): ReactNode => {
  const { onClose, onCreate } = handlers;
  const target = options.selection.at(-1);

  if (!at || !target) {
    return null;
  }

  const items = menuItems(options, target, onCreate, (item) =>
    toHostItems(hosts, item)
  );

  return (
    <PreviewMenu
      at={at}
      label={`Actions for ${target.tag}`}
      items={items}
      onClose={onClose}
    />
  );
};

const usePreviewMenu = (options: Options): PreviewMenuHandle => {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const [creating, setCreating] = useState<SelectionContext[] | null>(null);

  const onContextMenu = useCallback(
    (point: { x: number; y: number }) => setAt(point),
    []
  );

  const close = useCallback(() => setAt(null), []);
  const closeCreate = useCallback(() => setCreating(null), []);

  const { selection } = options;
  const openCreate = useCallback(() => setCreating(selection), [selection]);

  const base = toHostBase(options);
  const isReact = options.ids.kind === "react";

  const hosts: MenuHosts = {
    icons: useIconHost({ ...base, selection }),
    patterns: usePatternHost({ ...base, isReact }),
    photos: useImageSearchHost({ ...base, selection }),
    props: usePropHost({ ...base, isReact }),
  };

  const { directionId, projectId } = options.ids;
  const { notify } = options.edits;

  const handlers = useMemo(
    () => ({ onClose: close, onCreate: openCreate }),
    [close, openCreate]
  );

  const createIds = useMemo((): CreateIds | null => {
    if (directionId) {
      return { directionId, projectId };
    }

    return null;
  }, [directionId, projectId]);

  const menu = (
    <>
      {toMenuNode(options, hosts, at, handlers)}
      {toCreateDialog(options, creating, createIds, closeCreate)}
      {toIconSlot(options, hosts)}
      {toPropSlot(options, hosts)}
      {toPatternSlot(options, hosts)}
      <ImageSearchMount
        directionId={directionId}
        host={hosts.photos}
        projectId={projectId}
        renderGenerate={renderGenerateTab}
        onDone={notify}
      />
    </>
  );

  return { menu, onContextMenu };
};

export { usePreviewMenu };
