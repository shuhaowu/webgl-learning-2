import textureImageUrl from "./assets/container2.png";
import specularImageUrl from "./assets/container2_specular.png";
import sphereStlUrl from "./assets/sphere.stl?url";

import { Renderer } from "./render.js";
import { managedAnimationFrameMetrics } from "./utils/ManagedAnimationFrames.js";
import { STL } from "./utils/STL.js";
import { loadImage } from "./utils/image.js";

function mustGetElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id) as T;
  if (el == null) {
    throw new Error(`${id} not found`);
  }

  return el;
}

async function main() {
  const canvas = mustGetElement<HTMLCanvasElement>("canvas");
  const frameDurDisplay = mustGetElement<HTMLSpanElement>("frame-dur-display");
  const loadDisplay = mustGetElement<HTMLSpanElement>("load-display");

  function renderOverlay() {
    const metrics = managedAnimationFrameMetrics();
    frameDurDisplay.textContent = metrics.lastFrameDuration.toFixed(1);
    loadDisplay.textContent = ((metrics.lastFrameAllCallbacksDuration / metrics.lastFrameDuration) * 100).toFixed(1);
  }

  setInterval(renderOverlay, 1000);

  const textureImageProm = loadImage(textureImageUrl);
  const specularImageProm = loadImage(specularImageUrl);
  const sphereProm = STL.loadFromUrl(sphereStlUrl);

  const textureImage = await textureImageProm;
  const specularImage = await specularImageProm;
  const sphere = await sphereProm;

  const renderer = new Renderer(canvas, textureImage, specularImage, sphere);
  renderer.start();
}

main();
