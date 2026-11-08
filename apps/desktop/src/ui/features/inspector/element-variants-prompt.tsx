import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface Props {
  readonly tag: string;
}

const ElementVariantsPrompt = ({ tag }: Props): ReactElement => (
  <p className="variation-card-prompt">
    {copy.versionsOfTheSelected}
    <code>{tag}</code> {copy.onlyTheRestOfThe}
  </p>
);

export { ElementVariantsPrompt };
