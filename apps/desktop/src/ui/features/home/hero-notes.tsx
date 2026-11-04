import { ComposerAlert } from "./home-composer-parts.js";

function HeroNotes({
  windowDrag,
  formError,
  onClearError,
}: {
  windowDrag: boolean;
  formError: string | null;
  onClearError: () => void;
}) {
  return (
    <>
      {windowDrag && (
        <p className="home-drop-anywhere">
          Drop anywhere: the folder goes on the prompt
        </p>
      )}
      {formError && (
        <ComposerAlert onClose={onClearError}>{formError}</ComposerAlert>
      )}
    </>
  );
}

export { HeroNotes };
