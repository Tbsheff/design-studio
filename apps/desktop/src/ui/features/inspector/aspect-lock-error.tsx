import type { ReactElement } from "react";

const AspectLockError = ({
  error,
}: {
  readonly error: string | null;
}): ReactElement | null => {
  if (!error) {
    return null;
  }

  return (
    <p className="ins-note" role="alert">
      {error}
    </p>
  );
};

export { AspectLockError };
