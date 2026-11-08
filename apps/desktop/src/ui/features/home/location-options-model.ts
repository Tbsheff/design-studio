import { shortenHome } from "@design-studio/contracts/folders";
import type { WorkspaceFolder } from "@design-studio/contracts/folders";
import type { UiSelectOption } from "@design-studio/ui";

const DEFAULT = "default";
const CHOOSE = "choose";

interface LocationLabels {
  readonly fallback: string;
  readonly isUnsupported: boolean;
}

const toChooseLabel = (isUnsupported: boolean): string => {
  if (isUnsupported) {
    return "Paste a folder path…";
  }

  return "Choose folder…";
};

const toCustomOptions = (
  usable: WorkspaceFolder[],
  value: string | null,
  homeDir: string | null
): UiSelectOption[] => {
  if (value && !usable.some((folder) => folder.path === value)) {
    return [{ label: shortenHome(value, homeDir), value }];
  }

  return [];
};

const listLocationOptions = (
  usable: WorkspaceFolder[],
  value: string | null,
  homeDir: string | null,
  labels: LocationLabels
): UiSelectOption[] => [
  { label: labels.fallback, value: DEFAULT },
  ...usable.map((folder) => ({ label: folder.label, value: folder.path })),
  ...toCustomOptions(usable, value, homeDir),
  { label: toChooseLabel(labels.isUnsupported), value: CHOOSE },
];

const toLocationValue = (next: string): string | null => {
  if (next === DEFAULT) {
    return null;
  }

  return next;
};

export { CHOOSE, DEFAULT, listLocationOptions, toLocationValue };
