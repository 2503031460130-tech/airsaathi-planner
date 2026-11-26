import { build } from "esbuild";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";

// Public static demo: sample data only, AI off, no network calls.
// Output: public-demo/ (this is the folder deployed at the demo URL).
await rm("public-demo", { recursive: true, force: true });
await mkdir("public-demo", { recursive: true });
await build({
  entryPoints: ["src/main-demo.tsx"],
  bundle: true,
  outfile: "public-demo/main.js",
  minify: true,
  loader: { ".css": "css", ".png": "dataurl" },
  define: { __DEMO_ONLY__: "true" },
  sourcemap: false,
});
const html = (await readFile("index.html", "utf8")).replace(
  "<title>AirSaathi private evaluation</title>",
  "<title>AirSaathi public demo</title>",
);
await writeFile("public-demo/index.html", html);
