export interface CroppedImageOptions {
  imageSrc: string;
  pixelCrop: { width: number; height: number; x: number; y: number };
  rotation?: number;
  flip?: { horizontal: boolean; vertical: boolean };
  filter?: string;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.setAttribute("crossOrigin", "anonymous");
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });

const toRad = (value: number) => (value * Math.PI) / 180;

const rotateSize = (width: number, height: number, rotation: number) => {
  const rotRad = toRad(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
};

export const getCroppedImage = async ({
  imageSrc,
  pixelCrop,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  filter,
}: CroppedImageOptions): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to retrieve canvas context");
  }

  const rotRad = toRad(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation,
  );

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  if (filter) {
    ctx.filter = filter;
  }

  ctx.drawImage(image, 0, 0);

  const cropX = Math.max(0, Math.round(pixelCrop.x));
  const cropY = Math.max(0, Math.round(pixelCrop.y));
  const cropWidth = Math.min(
    bBoxWidth - cropX,
    Math.round(pixelCrop.width),
  );
  const cropHeight = Math.min(
    bBoxHeight - cropY,
    Math.round(pixelCrop.height),
  );

  const data = ctx.getImageData(cropX, cropY, cropWidth, cropHeight);

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = cropWidth;
  outputCanvas.height = cropHeight;

  const outputCtx = outputCanvas.getContext("2d");
  if (!outputCtx) {
    throw new Error("Failed to retrieve output canvas context");
  }

  outputCtx.putImageData(data, 0, 0);

  return outputCanvas.toDataURL("image/jpeg", 0.92);
};
