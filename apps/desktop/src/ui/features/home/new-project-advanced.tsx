import { Icon } from "@design-studio/ui";
import { Suspense, lazy, useCallback, useState } from "react";
import type { ReactElement, SyntheticEvent } from "react";

import type { SettingsFields as SettingsFieldsView } from "../../app/shell/settings-fields.js";
import type { SettingsDraft } from "../chat/settings-draft-model.js";
import { AskFirstField } from "./ask-first-field.js";
import { copy } from "./copy.js";
import { DesignMdField } from "./design-md-field.js";
import { DesignMdFilePick } from "./design-md-file-pick.js";

const ICON_SIZE = 14;

const importFields = async (): Promise<{
  readonly default: typeof SettingsFieldsView;
}> => {
  const loaded = await import("../../app/shell/settings-fields.js");

  return { default: loaded.SettingsFields };
};

const SettingsFields = lazy(importFields);

const runFieldsPreload = (): void => {
  importFields();
};

interface Props {
  readonly draft: SettingsDraft;
  readonly onDraft: (next: SettingsDraft) => void;
  readonly designMd: string;
  readonly onDesignMd: (value: string) => void;
  readonly onError: (message: string) => void;
  readonly isInitiallyOpen: boolean;
}

const toSettingsFields = (
  isOpen: boolean,
  draft: SettingsDraft,
  onDraft: (next: SettingsDraft) => void
): ReactElement | null => {
  if (!isOpen) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <SettingsFields draft={draft} onChange={onDraft} />
    </Suspense>
  );
};

const NewProjectAdvanced = ({
  draft,
  onDraft,
  designMd,
  onDesignMd,
  onError,
  isInitiallyOpen,
}: Props): ReactElement => {
  const [isOpen, setIsOpen] = useState(isInitiallyOpen === true);

  const toggle = useCallback(
    (event: SyntheticEvent<HTMLDetailsElement>): void => {
      setIsOpen(event.currentTarget.open);
    },
    []
  );

  return (
    <details className="advanced" open={isOpen} onToggle={toggle}>
      <summary onPointerEnter={runFieldsPreload} onFocus={runFieldsPreload}>
        <Icon name="chevronRight" size={ICON_SIZE} />
        {copy.advanced}
      </summary>
      <div className="advanced-body">
        {toSettingsFields(isOpen, draft, onDraft)}
        <AskFirstField />
        <DesignMdField value={designMd} onChange={onDesignMd} />
        <DesignMdFilePick onDesignMd={onDesignMd} onError={onError} />
      </div>
    </details>
  );
};

export { NewProjectAdvanced };
