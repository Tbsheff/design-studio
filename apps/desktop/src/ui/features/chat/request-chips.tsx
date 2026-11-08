import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { runLevel, toModeClass, toRequestMode } from "./chat-parts-model.js";
import { copy } from "./copy.js";
import { LevelChip } from "./level-chip.js";
import { toPlural } from "./plural-model.js";
import type { RunView } from "./run-state-model.js";
import { skillDisplayName } from "./skills-model.js";

const CHIP_ICON_SIZE = 12;

const RequestChips = ({
  run,
  skills,
}: {
  run: RunView;
  skills: string[];
}): ReactElement | null => {
  const req = run.request;

  if (!req) {
    return null;
  }

  const selected = req.selection?.length ?? 0;
  const files = req.attachmentIds?.length ?? 0;
  const mode = toRequestMode(req);
  const modeClass = toModeClass(req);

  return (
    <div className="msg-chips">
      {req.task !== "design-system" && <LevelChip level={runLevel(run)} />}
      {mode && <span className={`ui-chip mode-tag ${modeClass}`}>{mode}</span>}
      {selected > 0 && (
        <span className="ui-chip">
          <Icon name="pointer" size={CHIP_ICON_SIZE} />
          {selected}
          {copy.selected}
        </span>
      )}
      {files > 0 && (
        <span className="ui-chip">
          <Icon name="image" size={CHIP_ICON_SIZE} />
          {files}
          {copy.image}
          {toPlural(files)}
        </span>
      )}
      {skills.map((id) => (
        <span
          key={id}
          className="ui-chip skill-chip"
          data-tip={`Asked the agent to use the ${id} skill`}
        >
          <Icon name="book" size={CHIP_ICON_SIZE} />
          {skillDisplayName(id)}
        </span>
      ))}
    </div>
  );
};

export { RequestChips };
