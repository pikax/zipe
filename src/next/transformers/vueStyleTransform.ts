import chalk from "chalk";
import {
  generateCodeFrame,
  SFCStyleCompileOptions,
  SFCStyleBlock,
} from "@vue/compiler-sfc";
import { ZipeScriptTransform } from "../transformers";
import { SFCCompiler } from "../../utils";
import { posix } from "path";
import hash_sum from "hash-sum";
const debug = require("debug")("zipe:transformers:template");

export const vueStyleTransform: ZipeScriptTransform = async (
  content,
  filePath,
  option,
  extra: {
    compiler: SFCCompiler;
    style: SFCStyleBlock;
  } & SFCStyleCompileOptions
) => {
  const start = Date.now();

  const id = hash_sum(filePath);
  const style = extra.style;

  if (style.scoped) {
    console.log("scoped style", id, filePath);
  }

  const { code, map, errors, modules } = await extra.compiler.compileStyleAsync(
    {
      ...extra,
      source: style.content,
      filename: filePath,
      id: `data-v-${id}`,
      scoped: style.scoped != null,
      modules: style.module != null,
      preprocessLang: style.lang as any,
    }
  );

  if (errors.length) {
    console.error(chalk.red(`\n[zipe] SFC style compilation error: `));

    errors.forEach((e: any) => {
      if (typeof e === "string") {
        console.error(e);
      } else {
        const lineOffset = style.loc.start.line - 1;
        if (e.line && e.column) {
          console.log(
            chalk.underline(`${filePath}:${e.line + lineOffset}:${e.column}`)
          );
        } else {
          console.log(chalk.underline(filePath));
        }
        const filenameRE = new RegExp(
          ".*" +
            posix.basename(filePath).replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&") +
            "(:\\d+:\\d+:\\s*)?"
        );
        const cleanMsg = e.message.replace(filenameRE, "");
        console.error(chalk.yellow(cleanMsg));
        if (e.line && e.column && cleanMsg.split(/\n/g).length === 1) {
          if (style.map) {
            const original = style.map.sourcesContent![0];
            const offset =
              original
                .split(/\r?\n/g)
                .slice(0, e.line + lineOffset - 1)
                .map((l) => l.length)
                .reduce((total, l) => total + l + 1, 0) +
              e.column -
              1;
            console.error(generateCodeFrame(original, offset, offset + 1));
          }
        }
      }
    });
  }

  debug(`${filePath} style compiled compiled in ${Date.now() - start}ms.`);

  return {
    code,
    map,
    modules,
  };
};
