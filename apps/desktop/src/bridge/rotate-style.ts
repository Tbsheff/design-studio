const HALF_TURN = 180;

const DEGREES = HALF_TURN / Math.PI;

const PRECISION = 100;

const MATRIX_OPEN = "matrix(";

const toMatrixAngle = (transform: string): number => {
  const text = transform.trim();

  if (!text.startsWith(MATRIX_OPEN) || !text.endsWith(")")) {
    return 0;
  }

  const parts = text.slice(MATRIX_OPEN.length, -1).split(",").map(Number);
  const [scaleX = 1, skewY = 0, skewX = 0, scaleY = 1] = parts;

  if (scaleX * scaleY - skewY * skewX <= 0) {
    return 0;
  }

  return (
    Math.round(Math.atan2(skewY, scaleX) * DEGREES * PRECISION) / PRECISION
  );
};

const toRotateAngle = (rotate: string): string => {
  const last = rotate.split(" ").at(-1) ?? "";

  if (last.endsWith("deg")) {
    return last;
  }

  return "0deg";
};

const toRotateText = (computed: CSSStyleDeclaration): string => {
  const rotate = computed.getPropertyValue("rotate").trim();

  if (rotate && rotate !== "none") {
    return toRotateAngle(rotate);
  }

  return `${toMatrixAngle(computed.getPropertyValue("transform"))}deg`;
};

export { toRotateText };
