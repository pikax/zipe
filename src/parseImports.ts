import chalk from "chalk";
import { parse, ImportSpecifier } from "es-module-lexer";
import { ModuleResolver } from "./next";
import { ZipeDependency } from "./next/parse";
import { resolveImport } from "./resolveImport";
const debug = require("debug")("vite:import");

const httpRE = /^https?:\/\//;
const isExternalUrl = (url: string) => httpRE.test(url);

export function parseImportsExports(
  content: string,
  importer: string,
  resolver: ModuleResolver
): [ZipeDependency[], string[]] {
  try {
    let imports: ImportSpecifier[] = [];
    let exports: string[] = [];
    try {
      [imports, exports] = parse(content);
    } catch (e) {
      console.log("e", { e, content });
      console.error(
        chalk.yellow(
          `[zipe] failed to parse ${chalk.cyan(
            importer
          )} for import.\nIf you are using ` +
            `JSX, make sure to named the file with the .jsx extension.`
        )
      );
    }

    const imported: ZipeDependency[] = [];

    if (imports.length) {
      debug(`${importer}: rewriting`);

      for (let i = 0; i < imports.length; i++) {
        const {
          s: start,
          e: end,
          d: dynamicIndex,
          ss: lineStart,
          se: lineEnd,
        } = imports[i];
        let id = content.substring(start, end);
        let hasLiteralDynamicId = false;
        if (dynamicIndex >= 0) {
          const literalIdMatch = id.match(/^(?:'([^']+)'|"([^"]+)")$/);
          if (literalIdMatch) {
            hasLiteralDynamicId = true;
            id = literalIdMatch[1] || literalIdMatch[2];
          }
        }

        const dep = {
          module: content.slice(start, end),
          importPath: content.slice(start - 1, end + 1),
          importLine: content.slice(lineStart, lineEnd),
          dynamic: dynamicIndex !== -1,
        };
        if (dynamicIndex === -1 || hasLiteralDynamicId) {
          // do not rewrite external imports
          if (isExternalUrl(id)) {
            continue;
          }
          imported.push({
            ...dep,
            info: resolveImport(importer, id, resolver),
          });
        } else {
          imported.push({
            ...dep,
            info: {
              fullPath: undefined as any, //TODO FIX ME
              name: id,
              path: id,
            },
          });
          console.log(`[zipe] ignored dynamic import(${id})`);
        }
      }
      debug(`${importer}: found ${imports.length}`, imported);
    }
    return [imported, exports];
  } catch (e) {
    console.error(
      `[zipe] Error: module imports parsing failed for ${importer}.\n`,
      e
    );
    debug(content);
    return [[], []];
  }
}
