import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { STORAGE_KEY } from "../src/utils/storage.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Nextly branding is consistent while existing task storage stays compatible", () => {
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  assert.equal(pkg.name, "nextly");
  assert.equal(lock.name, "nextly");
  assert.equal(lock.packages[""].name, "nextly");
  assert.match(read("index.html"), /<title>Nextly/);
  assert.match(read("src/components/Sidebar.tsx"), /Nextly/);
  assert.match(read("README.md"), /https:\/\/github\.com\/wisangdg\/nextly\.git/);
  for (const path of ["README.md", "index.html", "src/components/Sidebar.tsx"]) {
    assert.doesNotMatch(read(path), /taskme/i);
  }
  assert.equal(STORAGE_KEY, "tasks");
});
