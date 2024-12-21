import type { UserConfig } from "vite";

export default {
  build: {
    // minimum transformations so we don't generate polyfills for getting
    // private variables.
    target: "esnext",

    // do not minify to make debugging easier
    minify: false,
  },
} satisfies UserConfig;
