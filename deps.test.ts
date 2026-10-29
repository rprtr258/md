import {expect, test} from "bun:test";

// index.ts imports ./common/* directly, so the published package and git
// installs resolve common's runtime dependencies through the root
// package.json. If common gains a dependency, the root must declare it too.
test("root declares every runtime dependency of common/", async () => {
  const root = await Bun.file("package.json").json();
  const common = await Bun.file("common/package.json").json();
  for (const [name, spec] of Object.entries(common.dependencies)) {
    expect(
      root.dependencies[name],
      `${name} is a dependency of common/ but missing from the root package.json`,
    ).toBe(spec);
  }
});
