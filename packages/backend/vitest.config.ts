import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environmentMatchGlobs: [["convex/**", "edge-runtime"]],
    testTimeout: 30_000,
  },
});
