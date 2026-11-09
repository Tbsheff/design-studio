import type {
  ComponentInfo,
  ProjectKind,
  SelectionContext,
} from "@design-studio/contracts";
import type { InsertableComponent } from "@design-studio/contracts/insert";
import type { ReactNode } from "react";

import type { ComponentList } from "./use-components.js";

type MenuAnchor = Record<"x" | "y", number>;

interface GalleryRender {
  component: InsertableComponent | null;
  onClose: () => void;
}

interface CodeSlot {
  target: {
    directionId: string;
    file: string;
    line: number;
    projectId: string;
  } | null;
  onClose: () => void;
}

interface Props {
  renderCode?: (slot: CodeSlot) => ReactNode;
  renderGallery?: (slot: GalleryRender) => ReactNode;
  projectId: string;
  directionId: string | null;
  list: ComponentList;
  active: boolean;
  onMention: (component: ComponentInfo) => void;
  kind?: ProjectKind;
  selection?: SelectionContext[];
}

export type { CodeSlot, GalleryRender, MenuAnchor, Props };
