import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ComposerAlert } from "./home-composer-parts.js";

const HeroNotes = ({
  isWindowDragged,
  formError,
  onClearError,
}: {
  readonly isWindowDragged: boolean;
  readonly formError: string | null;
  readonly onClearError: () => void;
}): ReactElement => (
  <>
    {isWindowDragged && (
      <p className="home-drop-anywhere">{copy.dropAnywhereTheFolderGoes}</p>
    )}
    {formError && (
      <ComposerAlert onClose={onClearError}>{formError}</ComposerAlert>
    )}
  </>
);

export { HeroNotes };
