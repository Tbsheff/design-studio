import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

interface SuggestionItemProps {
  readonly onPick: (text: string) => void;
  readonly text: string;
}

const SuggestionItem = ({
  onPick,
  text,
}: SuggestionItemProps): ReactElement => {
  const handleKeepFocus = useCallback((event: MouseEvent): void => {
    event.preventDefault();
  }, []);

  const handleInsert = useCallback((): void => {
    onPick(text);
  }, [onPick, text]);

  return (
    <button
      type="button"
      className="ui-menu-item"
      onClick={handleInsert}
      onMouseDown={handleKeepFocus}
    >
      <code>{text}</code>
    </button>
  );
};

export { SuggestionItem };
