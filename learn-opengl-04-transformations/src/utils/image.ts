export function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();

  const prom = new Promise<HTMLImageElement>((resolve, reject) => {
    img.addEventListener("load", () => {
      resolve(img);
    });
    img.addEventListener("error", () => {
      reject("failed to load message");
    });
  });
  img.src = src;

  return prom;
}
