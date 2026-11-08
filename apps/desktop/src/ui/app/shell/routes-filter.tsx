import { useCallback, useEffect, useRef } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";

interface RoutesFilterProps {
  readonly filter: string;
  readonly onChange: (value: string) => void;
  readonly onEnter: () => void;
  readonly placeholder: string;
}

const RoutesFilter = ({
  filter,
  onChange,
  onEnter,
  placeholder,
}: RoutesFilterProps): ReactElement => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const changeFilter = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void =>
      onChange(event.target.value),
    [onChange]
  );

  const submitOnEnter = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        event.preventDefault();
        onEnter();
      }
    },
    [onEnter]
  );

  return (
    <input
      ref={ref}
      name="filter"
      className="app-routes-filter"
      value={filter}
      placeholder={placeholder}
      aria-label="Filter routes"
      onChange={changeFilter}
      onKeyDown={submitOnEnter}
    />
  );
};

export { RoutesFilter };
