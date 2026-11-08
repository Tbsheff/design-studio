import type { ReactElement } from "react";

import { MAX_IMAGES } from "../../domain/image-limits.js";
import { ComposerComments } from "../comments/composer-comments.js";
import { useCommentPrefill } from "../comments/use-comment-prefill.js";
import type { PrefillRequest } from "../comments/use-comment-prefill.js";
import { ComposerAlert } from "../home/home-composer-parts.js";
import { focusComposerInput } from "./composer-focus.js";
import { PromptAlerts } from "./prompt-alerts.js";
import type { PromptBoxProps } from "./prompt-box-props.js";
import { PromptComposer } from "./prompt-composer.js";
import { PromptFoot } from "./prompt-foot.js";
import { PromptFrame } from "./prompt-frame.js";
import { PromptPanels } from "./prompt-panels.js";
import { usePromptBase } from "./use-prompt-base.js";
import { usePromptView } from "./use-prompt-view.js";

type Props = PromptBoxProps & { prefill?: PrefillRequest | null };

const PromptBox = (props: Props): ReactElement => {
  const base = usePromptBase(props);

  const prefill = useCommentPrefill({
    draft: props.draft,
    focus: focusComposerInput,
    maxImages: MAX_IMAGES,
    request: props.prefill,
    setFiles: base.setFiles,
  });

  const { input, sending, slash } = usePromptView(props, base, prefill);

  return (
    <PromptFrame base={base} input={input}>
      <PromptAlerts base={base} Alert={ComposerAlert} />
      <PromptPanels base={base} input={input} slash={slash} />
      <PromptComposer
        box={props}
        base={base}
        input={input}
        slash={slash}
        sending={sending}
        prefill={prefill}
        Comments={ComposerComments}
      />
      <PromptFoot box={props} />
    </PromptFrame>
  );
};

export { PromptBox };
