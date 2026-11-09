import type { IconName } from "@design-studio/ui";

import type { KeyId } from "../../../shared/keymap.js";
import type { ColumnTab } from "../../platform/panel-tab";

interface RailTab {
  readonly icon: IconName;
  readonly keyId: KeyId;
  readonly label: string;
  readonly tab: ColumnTab;
}

const RAIL_TABS: readonly RailTab[] = [
  { icon: "layers", keyId: "layers", label: "Layers", tab: "layers" },
  { icon: "doc", keyId: "column-pages", label: "Pages", tab: "pages" },
  { icon: "assets", keyId: "column-assets", label: "Assets", tab: "assets" },
  {
    icon: "history",
    keyId: "column-versions",
    label: "Versions",
    tab: "versions",
  },
  { icon: "token", keyId: "column-tokens", label: "Tokens", tab: "tokens" },
  {
    icon: "component",
    keyId: "column-components",
    label: "Components",
    tab: "components",
  },
  {
    icon: "palette",
    keyId: "column-system",
    label: "Design system",
    tab: "system",
  },
];

const toColumnTitle = (tab: ColumnTab): string =>
  RAIL_TABS.find((entry) => entry.tab === tab)?.label ?? "";

export { RAIL_TABS, toColumnTitle };

export type { RailTab };
