import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { resolve, relative, sep, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
const server = createServer(async (req, res) => {
  try {
    const path =
      req.url === "/"
        ? "/index.html"
        : decodeURIComponent(req.url.split("?")[0]);
    const root = fileURLToPath(new URL("./public/", import.meta.url));
    const file = resolve(root, "." + path);
    const rel = relative(root, file);
    if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel))
      throw Error("Outside public/");
    const data = await readFile(file);
    res.setHeader(
      "Content-Type",
      path.endsWith(".js")
        ? "text/javascript"
        : path.endsWith(".css")
          ? "text/css"
          : "text/html",
    );
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  let ai = true,
    explain = 0;
  await page.route("**/api/session", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ authenticated: true, aiEnabled: ai }),
    }),
  );
  await page.route("**/api/explain", (r) => {
    explain++;
    return r.fulfill({
      status: 503,
      contentType: "application/json",
      body: "{}",
    });
  });
  await page.goto(base);
  await page.getByRole("button", { name: "Make my plan" }).waitFor();
  await page
    .getByRole("button", { name: "Generate general explanation" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Generate general explanation" })
      .isEnabled(),
    true,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Verify AI-disabled state" })
      .isDisabled(),
    true,
  );
  await page
    .getByRole("button", { name: "Verify AI-disabled state" })
    .click({ force: true, timeout: 2000 })
    .catch(() => {});
  assert.equal(explain, 0);
  ai = false;
  await page.reload();
  await page
    .getByRole("button", { name: "AI off, awaiting approval" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "AI off, awaiting approval" })
      .isDisabled(),
    true,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Verify AI-disabled state" })
      .isEnabled(),
    true,
  );
  assert.equal(explain, 0);
  console.log(
    "AI session-flag mock checks passed (2 states). Fictional mocks; no provider/auth.",
  );
} finally {
  await browser.close();
  server.close();
}
