function mustGetElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id) as T;
  if (el == null) {
    throw new Error(`${id} not found`);
  }

  return el;
}

function main() {
  const canvas = mustGetElement<HTMLCanvasElement>("canvas");
  const fpsDisplay = mustGetElement<HTMLSpanElement>("fps-display");
  const loadDisplay = mustGetElement<HTMLSpanElement>("load-display");
}

main();
