import { useEffect, useRef } from "react";
import type { ReactElement } from "react";

import { findElement } from "../../platform/find-element.js";
import { LISTBOX_ROLE } from "./aria-role-model.js";
import { copy } from "./copy.js";
import { MentionOptionRow } from "./mention-option-row.js";
import type { MentionOption } from "./mention-picker.js";

const isFirstFrame = (
  shown: readonly MentionOption[],
  index: number
): boolean =>
  shown.findIndex((option) => option.mention.kind === "frame") === index;

const MentionList = ({
  shown,
  current,
  loading,
  onPick,
  onHover,
  className,
}: {
  shown: MentionOption[];
  current: MentionOption | null;
  loading: boolean;
  onPick: (option: MentionOption) => void;
  onHover: (index: number) => void;
  className?: string;
}): ReactElement => {
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (current && list.current) {
      findElement(
        list.current,
        `[id="mention-${current.key}"]`
      )?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [current]);

  return (
    <div
      ref={list}
      className={`skill-pop mention-pop ${className ?? ""}`}
      data-testid="mention-list"
    >
      <ul
        role={LISTBOX_ROLE}
        aria-label={copy.mentionAFile}
        className="skill-opts"
        id="mention-options"
      >
        {shown.flatMap((option, index) => [
          isFirstFrame(shown, index) && (
            <li
              key="frames-heading"
              className="slash-heading"
              role="presentation"
            >
              {copy.mentionFrames}
            </li>
          ),
          <MentionOptionRow
            key={option.key}
            option={option}
            index={index}
            isCurrent={option === current}
            onHover={onHover}
            onPick={onPick}
          />,
        ])}
        {shown.length === 0 && (
          <li className="skill-empty">
            {loading && copy.mentionLoading}
            {!loading && copy.mentionNoMatch}
          </li>
        )}
      </ul>
      <p className="skill-pop-foot">{copy.moveOrTabAdd}</p>
    </div>
  );
};

export { MentionList };
