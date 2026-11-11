import type { ReactElement } from "react";

interface ConnectAiTitlesProps {
  readonly note: string;
  readonly title: string;
}

const ConnectAiTitles = ({
  note,
  title,
}: ConnectAiTitlesProps): ReactElement => (
  <div className="titles">
    <h3>{title}</h3>
    <p className="export-sub">{note}</p>
  </div>
);

export { ConnectAiTitles };
