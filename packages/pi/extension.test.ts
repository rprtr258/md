import {expect, test} from "bun:test";
import {run} from "./extension.ts";

test("run executes the CLI and returns stdout", async () => {
  expect(await run(["stats", "README.md"])).toContain("lines:");
});

test("run returns CLI error output on nonzero exit", async () => {
  expect(await run(["stats", "/nonexistent.md"])).toContain("File not found");
});
