// Raw text imports used by web.ts: bun-types only ships attribute-patterned
// module declarations for TypeScript >= 7.1 (the repo pins 6.0.x), which does
// not parse them, so the patterns are declared here without the attribute.
declare module "*.css" {
    let text: string;
    export = text;
}
declare module "*.html" {
    let text: string;
    export = text;
}
