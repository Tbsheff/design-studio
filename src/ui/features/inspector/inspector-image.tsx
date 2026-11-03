import { useRef, useState } from "react";

import {
  IMAGE_ACCEPT,
  IMAGE_FITS,
  focalOf,
  focalText,
  imageKindOf,
  type ImageFit,
} from "../../../shared/image.js";
import { runCommand } from "../../inspector-slots.js";
import { Icon } from "../../kit/Icon.js";
import { AltField } from "./alt-field.js";
import { FocalPad } from "./focal-pad.js";
import { clipboardImage } from "./image-api.js";
import {
  FIT_LABEL,
  FIT_TIP,
  attrOf,
  currentFit,
  sourceName,
  type Props,
} from "./image-model.js";
import { InspectorSection } from "./inspector-fields.js";
import { useImageSet } from "./use-image-set.js";
import { usePasteImage } from "./use-paste-image.js";

import "../../styles/inspector-image.css";

const InspectorImage = (props: Props) => {
  const kind = imageKindOf(props.selection);
  const background = kind === "background";
  const { busy, error, run, setError, placed } = useImageSet(props);
  const [alt, setAlt] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [fit, setFit] = useState<ImageFit | null>(() =>
    currentFit(props.selection, background)
  );

  const [focal, setFocal] = useState(
    () =>
      (background
        ? props.selection.styles["background-position"]
        : props.selection.styles["object-position"]) ?? "50% 50%"
  );

  usePasteImage(props.editable && kind !== null, (file) => void run({}, file));

  if (!kind) {
    return null;
  }

  const disabled = !props.editable;

  const paste = async () => {
    try {
      const blob = await clipboardImage();

      if (blob) {
        await run({}, blob);
      } else {
        setError("The clipboard has no image. Copy an image, then try again.");
      }
    } catch {
      setError(
        "The studio cannot read the clipboard. Allow clipboard access, then try again."
      );
    }
  };

  return (
    <InspectorSection
      title={background ? "Background image" : "Image"}
      label={
        <span className="img-name">
          {placed ?? sourceName(props.selection, background)}
        </span>
      }
    >
      <div className="img-rows">
        <div className="img-actions">
          <button
            type="button"
            className="btn small"
            disabled={disabled}
            data-tip="Pick an image file. You can also drop one on the canvas."
            onClick={() => fileInput.current?.click()}
          >
            <Icon name="image" size={12} />
            {busy ? "Placing…" : "Replace"}
          </button>
          <button
            type="button"
            className="btn ghost small"
            disabled={disabled}
            data-tip="Use the image on the clipboard"
            onClick={() => void paste()}
          >
            Paste
          </button>
          <button
            type="button"
            className="btn ghost small"
            disabled={disabled}
            data-tip="Search free stock photos and place one here"
            onClick={() => runCommand("image.find")}
          >
            Find photo
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={IMAGE_ACCEPT}
            hidden
            aria-label="Image file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";

              if (file) {
                void run({}, file);
              }
            }}
          />
        </div>
        <div className="segmented img-fit" role="group" aria-label="Fit">
          {IMAGE_FITS.map((option) => (
            <button
              key={option}
              type="button"
              className={fit === option ? "on" : ""}
              aria-pressed={fit === option}
              disabled={disabled}
              data-tip={FIT_TIP[option]}
              onClick={() => {
                setFit(option);
                void run({ fit: option });
              }}
            >
              {FIT_LABEL[option]}
            </button>
          ))}
        </div>
        <div className="img-focal-row">
          <FocalPad
            value={focal}
            disabled={disabled}
            onPick={(next) => {
              setFocal(next);
              void run({ focal: next });
            }}
          />
          <span className="img-focal-text">
            {focalText(focalOf(focal).x, focalOf(focal).y)}
          </span>
        </div>
        {!background && (
          <AltField
            initial={alt ?? attrOf(props.selection.outerHTML, "alt") ?? ""}
            disabled={disabled}
            onSave={(next) => {
              setAlt(next);
              void run({ alt: next });
            }}
          />
        )}
        {error && (
          <p className="ins-error img-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </InspectorSection>
  );
};

export default InspectorImage;
