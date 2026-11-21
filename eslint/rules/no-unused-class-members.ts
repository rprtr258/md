import type {Rule} from "eslint";
import {readdirSync, readFileSync} from "node:fs";
import path from "node:path";
import ts from "typescript";

// no-unused-class-members — flags class methods (incl. get/set) whose
// name never appears as an identifier or string literal anywhere else in the
// repo. Purely syntactic (no type checker): all repo .ts files are parsed
// once per eslint run and memoized, so uses across workspace tsconfig
// boundaries (playground/vscode calling compiler code) count. Biased to
// false negatives: any same-name identifier (call site, object key,
// interface signature, overload) or string literal masks the report. Never
// flagged: `private` members (tsc's noUnusedLocals covers them),
// `override`/`abstract`, constructor/computed/#-key members, `_`-prefixed
// names, and JSDoc `@public` (host/framework-called).
export const noUnusedClassMembers: Rule.RuleModule = (() => {
  let cache: {uses: Map<string, number>, defs: Map<string, number>} | undefined;
  const build = () => {
    if (cache !== undefined) return cache;
    const uses = new Map<string, number>(), defs = new Map<string, number>();
    const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
    const collect = (node: ts.Node): void => {
      if (ts.isIdentifier(node) || ts.isStringLiteral(node)) {
        bump(uses, node.text);
      } else if (
        (ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) &&
        (node.parent.kind === ts.SyntaxKind.ClassDeclaration || node.parent.kind === ts.SyntaxKind.ClassExpression) &&
        ts.isIdentifier(node.name) &&
        node.body !== undefined &&
        !node.name.text.startsWith("_") &&
        (node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.PrivateKeyword || mod.kind === ts.SyntaxKind.AbstractKeyword) ?? false)
      ) {
        bump(defs, node.name.text);
      }
      ts.forEachChild(node, collect);
    };
    const listTs = (dir: string, out: string[]): void => {
      for (const entry of readdirSync(dir, {withFileTypes: true})) {
        if (entry.isDirectory()) {
          if (!["node_modules", "dist", ".git", ".jj"].includes(entry.name)) listTs(path.join(dir, entry.name), out);
        } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
          out.push(path.join(dir, entry.name));
        }
      }
    };
    const files: string[] = [];
    // Repo root: this file lives at <root>/eslint/rules/.
    listTs(path.join(import.meta.dirname, "..", ".."), files);
    for (const file of files) collect(ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true));
    const built = {uses, defs};
    cache = built;
    return built;
  };
  return {
    meta: {
      type: "problem",
      docs: {description: "flags class methods never referenced anywhere in the repo"},
      schema: [],
      messages: {unused: "Method '{{name}}' is never referenced; if it is called externally (host/framework), tag it with a JSDoc @public."},
    },
    create(context) {
      return {
        MethodDefinition(node) {
          if (node.computed || node.kind === "constructor") return;
          if (node.key.type !== "Identifier") return;
          const member = node as typeof node & {accessibility?: string, override?: boolean, abstract?: boolean};
          if (member.accessibility === "private" || member.override === true || member.abstract === true) return;
          const name = node.key.name;
          if (name.startsWith("_")) return;
          if (context.sourceCode.getCommentsBefore(node).some((c) => c.type === "Block" && c.value.includes("@public"))) return;
          const {uses, defs} = build();
          if ((uses.get(name) ?? 0) === (defs.get(name) ?? 0)) {
            context.report({node, messageId: "unused", data: {name}});
          }
        },
      };
    },
  };
})();
