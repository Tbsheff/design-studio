import type { DeviceFrameId } from "@design-studio/contracts/device-frame";
import { Icon, UiSelect } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import {
  DEVICE_OPTIONS,
  NO_DEVICE,
  toDeviceValue,
  toStoredDevice,
} from "./device-frame-model.js";
import { protoCopy } from "./proto-copy.js";

interface PlayBarProps {
  readonly title: string;
  readonly hint: string;
  readonly isBackDisabled: boolean;
  readonly device: DeviceFrameId | null;
  readonly isHints: boolean;
  readonly onHints: (next: boolean) => void;
  readonly onDevice: (device: DeviceFrameId | null) => void;
  readonly onBack: () => void;
  readonly onRestart: () => void;
  readonly onExit: () => void;
}

const PlayBar = ({
  title,
  hint,
  isBackDisabled,
  device,
  isHints,
  onHints,
  onDevice,
  onBack,
  onRestart,
  onExit,
}: PlayBarProps): ReactElement => {
  const onChange = useCallback(
    (value: string): void => {
      if (value === NO_DEVICE) {
        onDevice(null);

        return;
      }

      onDevice(toStoredDevice(value));
    },
    [onDevice]
  );

  const onToggleHints = useCallback((): void => {
    onHints(!isHints);
  }, [isHints, onHints]);

  return (
    <div className="play-bar">
      <button
        type="button"
        className="icon-btn small"
        aria-label={copy.back}
        data-tip={copy.back7}
        disabled={isBackDisabled}
        onClick={onBack}
      >
        <Icon name="arrowLeft" size={14} />
      </button>
      <span className="play-title" data-testid="play-title">
        {title}
      </span>
      <span className="play-hint">{hint}</span>
      <button
        type="button"
        className="btn small ghost"
        aria-pressed={isHints}
        data-tip={protoCopy.hotspotHintsTip}
        data-testid="play-hotspot-toggle"
        onClick={onToggleHints}
      >
        <Icon name="eye" size={12} />
        {protoCopy.hotspotHints}
      </button>
      <UiSelect
        size="sm"
        aria-label={copy.playDevice}
        value={toDeviceValue(device)}
        options={DEVICE_OPTIONS}
        onChange={onChange}
      />
      <button type="button" className="btn small ghost" onClick={onRestart}>
        <Icon name="restore" size={12} />
        {copy.restart} <kbd>{copy.keyLetterR}</kbd>
      </button>
      <button type="button" className="btn small ghost" onClick={onExit}>
        <Icon name="close" size={12} />
        {copy.exit} <kbd>{copy.esc}</kbd>
      </button>
    </div>
  );
};

export { PlayBar };
