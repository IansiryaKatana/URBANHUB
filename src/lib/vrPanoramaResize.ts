/** Browser-side equirectangular resize → WebP variants for VR tour admin uploads. */

export type VrPanoramaVariant = "lg" | "sm" | "thumb";

export const VR_PANORAMA_VARIANTS: Array<{
  suffix: VrPanoramaVariant;
  width: number;
  height: number;
  quality: number;
}> = [
  { suffix: "lg", width: 6144, height: 3072, quality: 0.8 },
  { suffix: "sm", width: 4096, height: 2048, quality: 0.75 },
  { suffix: "thumb", width: 512, height: 256, quality: 0.7 },
];

const MAX_SOURCE_BYTES = 80 * 1024 * 1024; // 80MB originals

export function assertVrSourceFile(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose a 360 image (JPG, PNG, or WebP).");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Image is too large (max 80MB). Compress it or use the prep:vr script.");
  }
}

async function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/webp", quality);
  });
  if (!blob) throw new Error("WebP export failed in this browser. Try Chrome or Edge.");
  return blob;
}

/**
 * Resize a source 360 image to a single variant.
 * Uses createImageBitmap when available to keep memory lower on huge panoramas.
 */
export async function resizePanoramaVariant(
  file: File,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  let bitmap: ImageBitmap | null = null;
  try {
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(file, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: "high",
      });
    }
  } catch {
    bitmap = null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas for panorama resize.");

  if (bitmap) {
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
  } else {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Failed to decode 360 image."));
        el.src = url;
      });
      ctx.drawImage(img, 0, 0, width, height);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return canvasToWebpBlob(canvas, quality);
}

export async function buildVrPanoramaVariants(
  file: File,
  onProgress?: (label: string) => void,
): Promise<Record<VrPanoramaVariant, Blob>> {
  assertVrSourceFile(file);
  const out = {} as Record<VrPanoramaVariant, Blob>;
  for (const variant of VR_PANORAMA_VARIANTS) {
    onProgress?.(`Creating ${variant.suffix} (${variant.width}×${variant.height})…`);
    out[variant.suffix] = await resizePanoramaVariant(
      file,
      variant.width,
      variant.height,
      variant.quality,
    );
  }
  return out;
}

export function slugifyVrRoomId(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\.(jpe?g|png|webp|tiff?)$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
