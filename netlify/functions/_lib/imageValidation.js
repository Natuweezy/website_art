// Server-side image validation. The client-declared content_type is never
// trusted for storage — the actual file bytes are sniffed instead, so a
// mislabeled SVG/HTML file can't be stored with an executable content type
// in the (public) artworks bucket.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

const SIGNATURES = [
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] } // "GIF8"
];

export function detectImageMimeType(buffer) {
  for (const sig of SIGNATURES) {
    if (buffer.length >= sig.bytes.length && sig.bytes.every((b, i) => buffer[i] === b)) {
      return sig.mime;
    }
  }
  // WEBP: bytes 0-3 "RIFF", bytes 8-11 "WEBP"
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

const HEIC_BRANDS = ["heic", "heix", "heim", "heis", "hevc", "hevx", "hevm", "hevs", "mif1", "msf1"];

// HEIC/HEIF isn't in the accepted-signature list above and isn't converted —
// most browsers other than Safari can't render it in an <img> tag, so
// accepting the raw bytes would silently produce broken images on the live
// site rather than a clear error at upload time. This only exists to give a
// precise message for the common case (iPhone's default photo format),
// not to accept the file.
export function isHeic(buffer) {
  if (buffer.length < 12) return false;
  const isFtyp = buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70;
  if (!isFtyp) return false;
  const brand = buffer.subarray(8, 12).toString("ascii");
  return HEIC_BRANDS.includes(brand);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}
