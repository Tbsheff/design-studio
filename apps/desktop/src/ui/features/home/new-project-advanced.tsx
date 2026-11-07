import { Icon } from "@design-studio/ui";
import { lazy, Suspense, useState } from "react";
import type { ChangeEvent } from "react";

import type { SettingsDraft } from "../chat/settings-draft-model.js";

const loadFields = () => import("../../app/shell/settings-fields.js");

const SettingsFields = lazy(() =>
  loadFields().then((m) => ({ default: m.SettingsFields }))
);

interface Props {
  readonly draft: SettingsDraft;
  readonly onDraft: (next: SettingsDraft) => void;
  readonly designMd: string;
  readonly onDesignMd: (value: string) => void;
  readonly onError: (message: string) => void;
  readonly isInitiallyOpen: boolean;
}

export function NewProjectAdvanced(props: Props) {
  const [open, setOpen] = useState(props.isInitiallyOpen === true);

  const pickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) {
      return;
    }

    file
      .text()
      .then(props.onDesignMd)
      .catch(() => props.onError(`Could not read ${file.name}.`));
  };

  return (
    <details
      className="advanced"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary
        onPointerEnter={() => void loadFields()}
        onFocus={() => void loadFields()}
      >
        <Icon name="chevronRight" size={14} />
        Advanced
      </summary>
      <div className="advanced-body">
        {open && (
          <Suspense fallback={null}>
            <SettingsFields draft={props.draft} onChange={props.onDraft} />
          </Suspense>
        )}
        <label className="field">
          <span>
            DESIGN.md (optional). The agent reads it before the first run.
          </span>
          <textarea
            aria-label="DESIGN.md"
            className="mono"
            rows={5}
            value={props.designMd}
            onChange={(e) => props.onDesignMd(e.target.value)}
            placeholder="# Brand&#10;Primary color #0B6E4F. Headings in Georgia."
            spellCheck={false}
          />
        </label>
        <label className="btn small has-icon file-pick">
          <Icon name="file" size={14} />
          Load DESIGN.md from a file
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
}
