import textureImageUrl from "./assets/flag.png";

import { Renderer } from "./render.js";
import { managedAnimationFrameMetrics } from "./utils/ManagedAnimationFrames.js";
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

  const textureImage = await loadImage(textureImageUrl);

  const renderer = new Renderer(canvas, textureImage);
  renderer.start();
}

main();