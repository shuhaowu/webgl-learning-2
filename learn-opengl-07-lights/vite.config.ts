import type { UserConfig } from "vite";

export default {
  build: {
    target: "esnext",
    minify: false,
  },
} satisfies UserConfig;
