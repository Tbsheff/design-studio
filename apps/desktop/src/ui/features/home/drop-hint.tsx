import { Icon } from "@design-studio/ui";

function DropHint({ isOn }: { readonly isOn: boolean }) {
  if (!isOn) {
    return null;
  }

  return (
    <div className="home-drop-hint" aria-hidden="true">
      <Icon name="image" size={16} />
      Drop an app folder, an image or a link to build on it
    </div>
  );
}

export { DropHint };
