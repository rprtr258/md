import {readFileSync} from "node:fs";
import {expect, test} from "bun:test";

// index.ts imports ./common/* directly, so the published package and git
// installs resolve common's runtime dependencies through the root
// package.json. If common gains a dependency, the root must declare it too.
const root = JSON.parse(readFileSync("package.json", "utf8")) as {dependencies: Record<string, string>};
const common = JSON.parse(readFileSync("common/package.json", "utf8")) as {dependencies: Record<string, string>};

test.each(Object.entries(common.dependencies))(
  "root package.json declares common/ dependency %s",
  (name, spec) => {
    expect(root.dependencies[name]).toBe(spec);
  },
);
