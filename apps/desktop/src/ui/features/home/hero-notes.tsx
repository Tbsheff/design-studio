import { ComposerAlert } from "./home-composer-parts.js";

const HeroNotes = ({
  isWindowDragged,
  formError,
  onClearError,
}: {
  readonly isWindowDragged: boolean;
  readonly formError: string | null;
  readonly onClearError: () => void;
}) => (
  <>
    {isWindowDragged && (
      <p className="home-drop-anywhere">
        Drop anywhere: the folder goes on the prompt
      </p>
    )}
    {formError && (
      <ComposerAlert onClose={onClearError}>{formError}</ComposerAlert>
    )}
  </>
);

export { HeroNotes };
