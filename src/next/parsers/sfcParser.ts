import chalk from "chalk";

import { ZipeParser } from "../parser";
import {
  SFCParseOptions,
  SFCStyleCompileOptions,
  SFCTemplateCompileOptions,
} from "@vue/compiler-sfc";
import {
  ZipeScriptTransform,
  ZipeScriptTransformOptions,
} from "../transformers";
import { SFCCompiler } from "../../utils";

const debug = require("debug")("zipe:sfc");

interface SFCParserOptions {
  transformOptions: Partial<ZipeScriptTransformOptions>;

  compiler: SFCCompiler;

  sfc: Partial<Omit<SFCParseOptions, "filename">>;
  style: Partial<SFCStyleCompileOptions>;
  template: Partial<SFCTemplateCompileOptions>;
}

export function buildSFCParser(
  root: string,
  options: SFCParserOptions
): ZipeParser {
  return async (
    content: string,
    publicPath: string,
    transformers: Record<string, ZipeScriptTransform>
  ) => {
    const transformOptions: ZipeScriptTransformOptions = {
      root,
      ...options.transformOptions,

      minify: false, // we want to minify on post not at parsing!
    };

    const descriptor = fileParser(
      options.compiler,
      options.sfc,
      content,
      publicPath
    );

    const scoped = descriptor.styles.some((x) => x.scoped);

    if (!transformers[descriptor.script?.lang ?? "js"]) {
      console.warn(`[zipe] No transformer for `, descriptor.script?.lang);
    }
    const promises = [
      descriptor.script
        ? transformers[descriptor.script.lang ?? "js"]
          ? transformers[descriptor.script.lang ?? "js"](
              descriptor.script.content,
              publicPath,
              transformOptions,
              options
            )
          : Promise.resolve({ code: descriptor.script.content, map: undefined })
        : Promise.resolve({ code: "", map: undefined }),

      descriptor.template
        ? transformers["vue.template"](
            descriptor.template.content,
            publicPath,
            transformOptions,
            {
              ...options,
              compiler: options.compiler,
              template: options.template,
              scoped,
            }
          )
        : Promise.resolve({ code: "", map: undefined }),
      descriptor.template
        ? transformers["vue.template"](
            descriptor.template.content,
            publicPath,
            transformOptions,
            {
              ...options,
              compiler: options.compiler,
              template: options.template,
              scoped,
              ssr: true,
            }
          )
        : Promise.resolve({ code: "", map: undefined }),

      ...descriptor.styles.map((x) =>
        transformers["vue.style"](x.content, publicPath, transformOptions, {
          ...options,
          compiler: options.compiler,
          style: x,
        })
      ),
    ];

    const [
      scriptTransformed,
      templateTransformed,
      ssrTemplateTransformed,
      ...stylesTransformed
    ] = await Promise.all(promises);

    return {
      code: "",
      map: undefined,
      extra: {
        descriptor,
        script: scriptTransformed,
        template: templateTransformed,
        ssrTemplate: ssrTemplateTransformed,
        styles: stylesTransformed,
      },
    };
  };
}

function fileParser(
  compiler: SFCCompiler,
  options: SFCParseOptions,
  content: string,
  publicPath: string
) {
  if (typeof content !== "string") {
    content = (content as object).toString();
  }
  const start = Date.now();

  const { descriptor, errors } = compiler.parse(content, {
    ...options,
    filename: publicPath,
  });

  if (errors.length) {
    console.error(chalk.red(`\n[zipe] SFC parse error: `));
    errors.forEach((e) => {
      console.error(
        chalk.underline(
          `${publicPath}:${e.loc!.start.line}:${e.loc!.start.column}`
        )
      );
      console.error(chalk.yellow(e.message));
      console.error(
        compiler.generateCodeFrame(
          content as string,
          e.loc!.start.offset,
          e.loc!.end.offset
        )
      );
    });
  }

  debug(`${publicPath} parsed in ${Date.now() - start}ms.`);

  return descriptor;
}
