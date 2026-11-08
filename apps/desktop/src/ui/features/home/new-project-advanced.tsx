import { Icon } from "@design-studio/ui";
import { Suspense, lazy, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";

import type { SettingsDraft } from "../chat/settings-draft-model.js";
import { copy } from "./copy.js";

const importFields = () => import("../../app/shell/settings-fields.js");

const SettingsFields = lazy(async () => ({
  default: (await importFields()).SettingsFields,
}));

interface Props {
  readonly draft: SettingsDraft;
  readonly onDraft: (next: SettingsDraft) => void;
  readonly designMd: string;
  readonly onDesignMd: (value: string) => void;
  readonly onError: (message: string) => void;
  readonly isInitiallyOpen: boolean;
}

const NewProjectAdvanced = (props: Props): ReactElement => {
  const [open, setOpen] = useState(props.isInitiallyOpen === true);

  const pickFile = (changeEvent: ChangeEvent<HTMLInputElement>): void => {
    const file = changeEvent.target.files?.[0];
    changeEvent.target.value = "";

    if (!file) {
      return;
    }

    const read = async (): Promise<void> => {
      try {
        props.onDesignMd(await file.text());
      } catch {
        props.onError(`Could not read ${file.name}.`);
      }
    };

    read();
  };

  return (
    <details
      className="advanced"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary
        onPointerEnter={() => importFields()}
        onFocus={() => importFields()}
      >
        <Icon name="chevronRight" size={14} />
        {copy.advanced}
      </summary>
      <div className="advanced-body">
        {open && (
          <Suspense fallback={null}>
            <SettingsFields draft={props.draft} onChange={props.onDraft} />
          </Suspense>
        )}
        <label className="field">
          <span>{copy.designMdOptionalTheAgent}</span>
          <textarea
            aria-label={copy.designMd}
            className="mono"
            rows={5}
            value={props.designMd}
            onChange={(eventArg) => props.onDesignMd(eventArg.target.value)}
            placeholder={copy.brandPrimaryColor0b6e4fHeadings}
            spellCheck={false}
          />
        </label>
        <label className="btn small has-icon file-pick">
          <Icon name="file" size={14} />
          {copy.loadDesignMdFromA}
          <input
            type="file"
            accept=".md,text/markdown,text/plain"
            hidden
            onChange={pickFile}
          />
        </label>
      </div>
    </details>
  );
};

export { NewProjectAdvanced };
