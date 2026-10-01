import {Type, type Static, type TSchema} from "@earendil-works/pi-ai";
import {defineTool, type ExtensionAPI} from "@earendil-works/pi-coding-agent";
import {frontmatter, links, list, map, read, section, stats, toc} from "@rprtr258/md-common/md.ts";
import {lint, lintSchema} from "@rprtr258/md-common/lint.ts";

// pi runs extensions in its own process under Node; the core is plain Node code,
// so the tools call it directly — no spawning, no bun on the PATH.
function mdTool<T extends TSchema>(name: string, description: string, parameters: T, text: (params: Static<T>) => Promise<string>) {
  return defineTool({
    name: `md_${name}`,
    label: `MD ${name}`,
    description,
    parameters,
    annotations: {readOnlyHint: true},
    async execute(_toolCallId, params) {
      return {content: [{type: "text", text: await text(params)}], details: undefined};
    },
  });
}

const file = Type.String({description: "Path to the file"});

export const tools = [
  mdTool("frontmatter", "Print the frontmatter (YAML) of a markdown file, optionally parsed as JSON. Empty output when the file has no frontmatter.",
    Type.Object({
      file,
      json: Type.Optional(Type.Boolean({description: "Print the frontmatter parsed as JSON"})),
    }),
    async (params) => frontmatter(await read(params.file), params.json ?? false) ?? ""),
  mdTool("links", "Print every link/image/autolink URL of a markdown file, one per line.",
    Type.Object({file}),
    async (params) => links(await read(params.file)).join("\n")),
  mdTool("toc", "Print the table of contents (headers) of a markdown file.",
    Type.Object({file}),
    async (params) => toc(await read(params.file)) ?? ""),
  mdTool("section", "Print everything under a heading of a markdown file.",
    Type.Object({
      file,
      heading: Type.String({description: "Exact heading text or its slug"}),
    }),
    async (params) => section(await read(params.file), params.heading)),
  mdTool("stats", "Print line counts and size of a markdown file.",
    Type.Object({file}),
    async (params) => stats(await read(params.file))),
  mdTool("list", "List all markdown files in a directory (recursive).",
    Type.Object({
      directory: Type.Optional(Type.String({description: "Directory to list (default: current directory)"})),
    }),
    (params) => list(params.directory)),
  mdTool("lint", "Lint a markdown file or directory with static deterministic rules. Returns diagnostics (file, line, rule, detail); empty output when clean.",
    Type.Object({
      path: Type.Optional(Type.String({description: "File or directory to lint (default: current directory)"})),
    }),
    (params) => lint(params.path)),
  mdTool("lint_schema", "Validate the frontmatter of a markdown file against a JSON Schema (YAML or JSON file). Returns validation errors when invalid.",
    Type.Object({
      file,
      schema: Type.String({description: "Path to the JSON Schema file"}),
    }),
    (params) => lintSchema(params.file, params.schema)),
  mdTool("map", "Print each markdown file in a directory with its heading tree beneath it.",
    Type.Object({
      directory: Type.Optional(Type.String({description: "Directory to map (default: current directory)"})),
      title: Type.Optional(Type.Boolean({description: "Print each file's title heading on one line"})),
    }),
    (params) => map(params.directory, params.title ?? false)),
  mdTool("convert", "Convert a PDF (text layer or page images) or PNG (OCR) file to markdown text.",
    Type.Object({file}),
    // lazy: pdfjs/tesseract/canvas are heavy, only load when a conversion actually happens
    async (params) => {
      const {convert} = await import("@rprtr258/md-common/convert.ts");
      return convert(params.file);
    }),
];

export default function (pi: ExtensionAPI): void {
  for (const tool of tools) {
    pi.registerTool(tool);
  }
}
