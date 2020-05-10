import { InternalResolver } from "vite/dist/resolver";
import MagicString from "magic-string";
import { rewriteImports } from "vite";
import { parse as parseImports } from "es-module-lexer";

export interface DependencyImport {
  // ./App.vue
  module: string;

  // './App.vue'
  importPath: string;

  // import {} from 'asdasd';
  importLine: string;

  isDynamic: boolean;
}

export type ImportReplacer = (
  importLine: string,
  r: DependencyImport
) => string;

export function replaceImports(
  content: string,
  resolver: InternalResolver,
  importer: string,
  replacer: ImportReplacer,
  s: MagicString
): [string, DependencyImport[]] {
  // TODO fix with magic string

  // TODO importer is always root??
  const rawScript = rewriteImports(content, importer, resolver);
  // TODO replace exports
  const [imports] = parseImports(rawScript);

  const result: DependencyImport[] = [];

  let script = rawScript.toString();

  for (const item of imports) {
    const module = rawScript.slice(item.s, item.e);
    const itemResult = {
      module,
      importPath: rawScript.slice(item.s - 1, item.e + 1), // get ""
      importLine: rawScript.slice(item.ss, item.se),
      isDynamic: item.d !== -1,
    };
    result.push(itemResult);

    script = script.replace(
      itemResult.importLine,
      replacer(itemResult.importLine, itemResult)
    );
  }

  return [script, result];
}
