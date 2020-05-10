import chalk from "chalk";
import {
  SFCTemplateCompileOptions,
  SFCTemplateBlock,
  generateCodeFrame,
} from "@vue/compiler-sfc";
import { posix } from "path";
import mergeOptions from "merge-options";
import { ZipeScriptTransform } from "../transformers";
import { SFCCompiler } from "../../utils";
import hash_sum from "hash-sum";

const debug = require("debug")("zipe:transformers:template");

export const vueTemplateTransform: ZipeScriptTransform = async (
  content,
  filePath,
  option,
  extra: {
    compiler: SFCCompiler;
    template: SFCTemplateBlock;
    scope: boolean | undefined;
  } & SFCTemplateCompileOptions
) => {
  const start = Date.now();

  const o = mergeOptions(extra, {
    compiler: undefined,
    compilerOptions: {
      scopeId: extra.scope ? `data-v-${hash_sum(filePath)}` : null,
    },
  });

  const { code, map, errors } = extra.compiler.compileTemplate({
    ...o,
    source: content,
    transformAssetUrls: {
      base: posix.dirname(filePath),
    },
    filename: filePath,
    inMap: extra.template.map,
    ssr: true,
  });

  if (errors.length) {
    console.error(chalk.red(`\n[vite] SFC template compilation error: `));
    errors.forEach((e) => {
      if (typeof e === "string") {
        console.error(e);
      } else {
        console.error(
          chalk.underline(
            `${filePath}:${e.loc!.start.line}:${e.loc!.start.column}`
          )
        );
        console.error(chalk.yellow(e.message));
        const original = extra.template.map!.sourcesContent![0];
        console.error(
          generateCodeFrame(original, e.loc!.start.offset, e.loc!.end.offset)
        );
      }
    });
  }

  debug(`${filePath} template compiled in ${Date.now() - start}ms.`);

  return {
    code,
    map,
  };
};
