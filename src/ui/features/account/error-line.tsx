import type { ReactElement } from "react";

const ErrorLine = ({
  error,
}: {
  readonly error: string | null;
}): ReactElement | null => {
  if (error === null) {
    return null;
  }

  return <p role="alert">{error}</p>;
};

export { ErrorLine };
