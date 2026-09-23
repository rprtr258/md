import {existsSync, statSync} from "node:fs";
import {dirname, resolve} from "node:path";
import {collectLinks, findFiles, frontmatter, headingText, processor, read} from "./md";

type Diagnostic = {
  rule: "missing-h1" | "duplicate-heading" | "heading-skip" | "broken-link" | "empty-link-url" | "unclosed-fence",
  line: number,
  detail: string,
};

async function* lintFile(file: string): AsyncGenerator<Diagnostic> {
  const source = await read(file);
  const tree = processor.parse(source);

  const headings = tree.children.filter(node => node.type === "heading");
  if (!headings.some(node => node.depth === 1)) {
    yield {rule: "missing-h1", line: headings[0]?.position?.start.line ?? 1, detail: "document has no H1 heading"};
  }

  const seen = new Map<string, number>();
  let previous: {depth: number} | undefined;
  for (const node of headings) {
    const line = node.position?.start.line ?? 0;
    const text = headingText(node);
    const first = seen.get(text);
    if (first !== undefined) {
      yield {rule: "duplicate-heading", line, detail: `"${text}" first seen on line ${first}`};
    } else {
      seen.set(text, line);
    }
    if (previous && node.depth - previous.depth > 1) {
      yield {rule: "heading-skip", line, detail: `h${previous.depth} to h${node.depth}`};
    }
    previous = node;
  }

  for (const {url, line} of collectLinks(tree)) {
    if (url === "") {
      yield {rule: "empty-link-url", line, detail: "link has empty url"};
      continue;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("#")) {
      continue;
    }
    const path = url.replace(/#.*$/, "");
    if (!existsSync(resolve(dirname(file), path))) {
      yield {rule: "broken-link", line, detail: url};
    }
  }

  let fence: {char: string, length: number, line: number} | undefined;
  for (const [i, line] of source.split("\n").entries()) {
    const open = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (!fence) {
      if (open) {
        const info = line.slice(open[0].length);
        if (!open[1]!.startsWith("`") || !info.includes("`")) {
          fence = {char: open[1]![0]!, length: open[1]!.length, line: i + 1};
        }
      }
    } else if (new RegExp(`^ {0,3}\\${fence.char}{${fence.length},}\\s*$`).test(line)) {
      fence = undefined;
    }
  }
  if (fence) {
    yield {rule: "unclosed-fence", line: fence.line, detail: "code fence opened but never closed"};
  }
}

export async function lint(path = "."): Promise<void> {
  const files: [path: string, file: string][] = existsSync(path) && statSync(path).isDirectory()
    ? (await findFiles(path)).map(file => [file, resolve(path, file)])
    : [[path, path]];
  const groups = await Promise.all(files.map(async ([display, file]): Promise<[string, Diagnostic[]]> => [display, await Array.fromAsync(lintFile(file))]));
  for (const [path, group] of groups.filter(([, group]) => group.length > 0)) {
    console.log(path);
    for (const {rule, line, detail} of group) {
      console.log(`  ${line}: ${rule}: ${detail}`);
    }
    console.log();
  }

  const diagnostics = groups.map(([, group]) => group.length).reduce((acc, x) => acc + x, 0);
  if (diagnostics > 0)
    throw new Error(`${diagnostics} issues found`);
}

export async function lintSchema(file: string, schemaFile: string): Promise<void> {
  const raw = frontmatter(await read(file));
  if (raw === undefined)
    throw new Error(`No frontmatter in ${file}`);
  const schema = Bun.YAML.parse(await read(schemaFile)) as {$schema?: string};
  const {default: Ajv} = schema.$schema?.includes("2020-12")
    ? await import("ajv/dist/2020")
    : await import("ajv");
  const validate = new Ajv({allErrors: true}).compile(schema);
  if (validate(Bun.YAML.parse(raw)))
    return;
  const errors = validate.errors ?? [];
  console.log(file);
  for (const {instancePath, message} of errors) {
    console.log(`  schema: ${instancePath || "/"} ${message}`);
  }
  throw new Error(`${errors.length} issues found`);
}
