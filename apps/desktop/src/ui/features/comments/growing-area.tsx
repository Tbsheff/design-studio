import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";
import { useCallback } from "react";

const MAX_LENGTH = 2000;

const GrowingArea = ({
  areaClass = "",
  disabled = false,
  label,
  onChange,
  onEnter,
  placeholder,
  value,
}: {
  areaClass?: string;
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  placeholder: string;
  value: string;
}): ReactElement => {
  const change = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void =>
      onChange(event.target.value),
    [onChange]
  );

  const keyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): void => {
      if (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.nativeEvent.isComposing
      ) {
        return;
      }

      event.preventDefault();
      onEnter();
    },
    [onEnter]
  );

  return (
    <textarea
      className={`comment-area ${areaClass}`}
      rows={1}
      aria-label={label}
      placeholder={placeholder}
      value={value}
      maxLength={MAX_LENGTH}
      disabled={disabled}
      onChange={change}
      onKeyDown={keyDown}
    />
  );
};

export { GrowingArea };
