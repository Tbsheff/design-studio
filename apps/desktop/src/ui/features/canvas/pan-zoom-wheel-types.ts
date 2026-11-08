interface WheelInput {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
}

interface FrameWheel extends WheelInput {
  clientX: number;
  clientY: number;
}

export type { FrameWheel, WheelInput };
