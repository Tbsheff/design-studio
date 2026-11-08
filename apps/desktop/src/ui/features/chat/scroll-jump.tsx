import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { ConversationScrollButton } from "../../ai/components/ai/conversation-scroll-button.js";
import { copy } from "./copy.js";
import { toStyled } from "./styled.js";

const JUMP_ICON_SIZE = 14;

const JumpButton = toStyled(
  ConversationScrollButton,
  "btn small chat-scroll-btn"
);

const ScrollJump = (): ReactElement => (
  <JumpButton>
    <Icon name="chevronDown" size={JUMP_ICON_SIZE} />
    {copy.jumpToLatest}
  </JumpButton>
);

export { ScrollJump };
