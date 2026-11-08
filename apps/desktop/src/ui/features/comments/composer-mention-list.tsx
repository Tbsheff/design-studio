import { createElement } from "react";
import type { ComponentProps, ReactElement } from "react";

import { MentionList } from "./deps.js";

type MentionListProps = ComponentProps<typeof MentionList>;

const toMentionListElement = (
  props: Omit<MentionListProps, "className">
): ReactElement =>
  createElement(MentionList, { ...props, className: "comment-mentions" });

export { toMentionListElement };
