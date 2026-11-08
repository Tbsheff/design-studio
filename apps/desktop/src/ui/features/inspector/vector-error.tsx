import type { ReactElement } from "react";

const VectorError = ({
  text,
}: {
  readonly text: string | null;
}): ReactElement | null => {
  if (!text) {
    return null;
  }

  return (
    <p className="ins-error" role="alert">
      {text}
    </p>
  );
};

export { VectorError };
