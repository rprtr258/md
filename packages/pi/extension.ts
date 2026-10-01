import {execFile} from "node:child_process";
import {createRequire} from "node:module";
import {dirname, join} from "node:path";
import {promisify} from "node:util";
import {Type, type Static, type TSchema} from "@earendil-works/pi-ai";
import {defineTool, type ExtensionAPI} from "@earendil-works/pi-coding-agent";

// pi runs extensions under Node, and the md core uses Bun APIs, so each tool
// spawns the CLI from the @rprtr258/md dependency instead of importing it.
const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve("@rprtr258/md/package.json")), "index.ts");

export async function run(args: string[], signal?: AbortSignal): Promise<string> {
  try {
    const {stdout} = await promisify(execFile)("bun", [cli, ...args], {maxBuffer: 64 * 1024 * 1024, signal});
    return stdout;
  } catch (error) {
    // Nonzero exit still carries useful output (lint diagnostics, "File not found", ...).
    const {stdout, stderr, message} = error as {stdout?: string, stderr?: string, message: string};
    return stdout || stderr || message;
  }
}

function mdTool<T extends TSchema>(name: string, description: string, parameters: T, command: (params: Static<T>) => string[]) {
  return defineTool({
    name: `md_${name}`,
    label: `MD ${name}`,
    description,
    parameters,
    annotations: {readOnlyHint: true},
    async execute(_toolCallId, params, signal) {
      return {content: [{type: "text", text: await run(command(params), signal)}], details: undefined};
    },
  });
}

const file = Type.String({description: "Path to the file"});

const tools = [
  mdTool("frontmatter", "Print the frontmatter (YAML) of a markdown file, optionally parsed as JSON. Empty output when the file has no frontmatter.",
    Type.Object({
      file,
      json: Type.Optional(Type.Boolean({description: "Print the frontmatter parsed as JSON"})),
    }),
    (params) => ["get", "frontmatter", params.file, ...(params.json ? ["--json"] : [])]),
  mdTool("links", "Print every link/image/autolink URL of a markdown file, one per line.",
    Type.Object({file}),
    (params) => ["get", "links", params.file]),
  mdTool("toc", "Print the table of contents (headers) of a markdown file.",
    Type.Object({file}),
    (params) => ["toc", params.file]),
  mdTool("section", "Print everything under a heading of a markdown file.",
    Type.Object({
      file,
      heading: Type.String({description: "Exact heading text or its slug"}),
    }),
    (params) => ["section", params.file, params.heading]),
  mdTool("stats", "Print line counts and size of a markdown file.",
    Type.Object({file}),
    (params) => ["stats", params.file]),
  mdTool("list", "List all markdown files in a directory (recursive).",
    Type.Object({
      directory: Type.Optional(Type.String({description: "Directory to list (default: current directory)"})),
    }),
    (params) => ["list", ...(params.directory ? [params.directory] : [])]),
  mdTool("lint", "Lint a markdown file or directory with static deterministic rules. Returns diagnostics (file, line, rule, detail); empty output when clean.",
    Type.Object({
      path: Type.Optional(Type.String({description: "File or directory to lint (default: current directory)"})),
    }),
    (params) => ["lint", ...(params.path ? [params.path] : [])]),
  mdTool("lint_schema", "Validate the frontmatter of a markdown file against a JSON Schema (YAML or JSON file). Returns validation errors when invalid.",
    Type.Object({
      file,
      schema: Type.String({description: "Path to the JSON Schema file"}),
    }),
    (params) => ["lint", "schema", params.file, params.schema]),
  mdTool("map", "Print each markdown file in a directory with its heading tree beneath it.",
    Type.Object({
      directory: Type.Optional(Type.String({description: "Directory to map (default: current directory)"})),
      title: Type.Optional(Type.Boolean({description: "Print each file's title heading on one line"})),
    }),
    (params) => ["map", ...(params.directory ? [params.directory] : []), ...(params.title ? ["--title"] : [])]),
  mdTool("convert", "Convert a PDF (text layer or page images) or PNG (OCR) file to markdown text.",
    Type.Object({file}),
    (params) => ["convert", params.file]),
];

export default function (pi: ExtensionAPI): void {
  for (const tool of tools) {
    pi.registerTool(tool);
  }
}
