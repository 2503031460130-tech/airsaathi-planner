import { build } from "esbuild";
import { mkdir, copyFile, rm } from "node:fs/promises";

// Private evaluation build (login-gated app). Output: public/
await rm("public", { recursive: true, force: true });
await mkdir("public", { recursive: true });
await build({
  entryPoints: ["src/main.tsx"],
  bundle: true,
  outfile: "public/main.js",
  minify: true,
  loader: { ".css": "css", ".png": "dataurl" },
  define: { __DEMO_ONLY__: "false" },
  sourcemap: false,
});
await copyFile("index.html", "public/index.html");
