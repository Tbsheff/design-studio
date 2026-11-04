const toCookieName = (slug: string): string => `pub_pass_${slug}`;

const readCookie = (header: string | null, name: string): string | null => {
  if (header === null) {
    return null;
  }

  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");

    if (key === name) {
      return rest.join("=");
    }
  }

  return null;
};

export { readCookie, toCookieName };
