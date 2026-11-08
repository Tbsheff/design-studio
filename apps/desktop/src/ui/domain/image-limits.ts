const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

const MAX_IMAGES = 4;
const MAX_REFERENCES = 3;
const IMAGE_LIMIT_MEGABYTES = 3.75;
const BYTES_PER_KILOBYTE = 1024;

const MAX_IMAGE_BYTES = Math.floor(
  IMAGE_LIMIT_MEGABYTES * BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE
);

const getImageProblem = (file: File): string | null => {
  if (!IMAGE_TYPES.has(file.type)) {
    return `${file.name} is not a PNG, JPEG, GIF or WebP image.`;
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name} is larger than 3.75 MB. Attach a smaller image.`;
  }

  return null;
};

export { IMAGE_TYPES, MAX_IMAGES, MAX_REFERENCES, getImageProblem };
