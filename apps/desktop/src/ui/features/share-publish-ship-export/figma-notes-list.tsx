import type { ReactElement } from "react";

const NOTES_SHOWN = 4;

interface Props {
  readonly notes: readonly string[];
}

const FigmaNotesList = ({ notes }: Props): ReactElement | null => {
  if (notes.length === 0) {
    return null;
  }

  return (
    <ul className="fgi-notes">
      {notes.slice(0, NOTES_SHOWN).map((note) => (
        <li key={note}>{note}</li>
      ))}
    </ul>
  );
};

export { FigmaNotesList };
