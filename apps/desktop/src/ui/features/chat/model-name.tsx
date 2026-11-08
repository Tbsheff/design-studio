import type { ReactNode } from "react";

const ModelName = ({ name }: { name: string }): ReactNode => {
  const at = name.lastIndexOf(" ");

  if (at === -1) {
    return name;
  }

  return (
    <>
      {name.slice(0, at)}
      <span className="model-pill-version"> {name.slice(at + 1)}</span>
    </>
  );
};

export { ModelName };
