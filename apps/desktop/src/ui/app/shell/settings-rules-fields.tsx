import { Suspense } from "react";
import type { ReactElement } from "react";

import type { SettingsDraft } from "../../features/chat/index.js";
import { CommandRules } from "../../features/commands/index.js";
import { SettingsFields } from "./settings-fields";

interface SettingsRulesFieldsProps {
  readonly draft: SettingsDraft;
  readonly onChange: (next: SettingsDraft) => void;
  readonly projectId: string;
}

const SettingsRulesFields = ({
  draft,
  onChange,
  projectId,
}: SettingsRulesFieldsProps): ReactElement => (
  <SettingsFields draft={draft} onChange={onChange}>
    <Suspense fallback={null}>
      <CommandRules projectId={projectId} />
    </Suspense>
  </SettingsFields>
);

export { SettingsRulesFields };
