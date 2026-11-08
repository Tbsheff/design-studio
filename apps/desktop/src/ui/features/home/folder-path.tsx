import { shortenHome } from "@design-studio/contracts/folders";
import type { ReactElement } from "react";

interface FolderPathProps {
  readonly path: string;
  readonly homeDir: string | null;
}

const FolderPath = ({ path, homeDir }: FolderPathProps): ReactElement => {
  const short = shortenHome(path, homeDir);
  const cut = short.lastIndexOf("/");
  let head = "";
  let tail = short;

  if (cut > 0) {
    head = short.slice(0, cut + 1);
    tail = short.slice(cut + 1);
  }

  return (
    <span className="folder-path" data-tip={path}>
      {head && <span className="folder-path-head">{head}</span>}
      <span className="folder-path-tail">{tail}</span>
    </span>
  );
};

export { FolderPath };
