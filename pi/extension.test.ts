import {expect, test} from "bun:test";
import {tools} from "./extension.ts";

function call(name: string, params: unknown): Promise<string> {
  const tool = tools.find(t => t.name === name)! as unknown as {
    execute: (...args: unknown[]) => Promise<{content: Array<{text: string}>}>;
  };
  return tool.execute("test", params, new AbortController().signal, {}, undefined)
    .then(result => result.content[0]!.text);
}

test("md_stats returns line counts", async () => {
  expect(await call("md_stats", {file: "README.md"})).toContain("lines:");
});

test("md_stats propagates read errors", async () => {
  expect(call("md_stats", {file: "/nonexistent.md"})).rejects.toThrow("File not found");
});
