import type { ReactElement } from "react";

interface ErrorLineProps {
  readonly message: string | null;
}

const ErrorLine = ({ message }: ErrorLineProps): ReactElement | null => {
  if (message === null) {
    return null;
  }

  return (
    <p className="ins-error" role="alert">
      {message}
    </p>
  );
};

export { ErrorLine };
