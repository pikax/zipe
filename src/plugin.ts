import { ServerPlugin, ServerPluginContext, rewriteImports } from "vite";
import resolve from "resolve-from";
import { buildViteCache, buildViteModuleResolver } from "./vite";
import { buildMemoryCache } from "./next";
import { buildOutputPipeline } from "./next/outputPipeline";
import { moduleRewrite } from "./next/transformers/moduleRewrite";
import { loadPostcssConfig, resolveCompiler } from "vite/dist/utils";
import { buildSFCParser } from "./next/parsers/sfcParser";
import { outputSSR, AppEnhancement } from "./outputSSR";
import { scriptTransforms, ZipeScriptTransform } from "./next/transformers";
import { scriptTransforms as ViteTransformers } from "./vite/transformers";
import { parse } from "./next/parse";
import { ParameterizedContext, DefaultState, DefaultContext } from "koa";
import { parse as parseUrl } from "url";

export type ZipeBuilder = (
  component: string,
  ctx?: ParameterizedContext<DefaultState, DefaultContext>,
  enhances?: AppEnhancement[]
) => Promise<string>;

export type ZipeViteContext = { zipeSSR: ZipeBuilder } & ServerPluginContext;

export function createViteSSR(
  plugin: (ctx: ZipeViteContext) => void
): ServerPlugin {
  return async (ctx) => {
    const { root, watcher, resolver } = ctx;
    const cache = buildViteCache(resolver);
    const moduleResolver = buildViteModuleResolver(resolver, root);
    const dependencies = buildMemoryCache();

    // // let vite know about this file
    // const viteCacheFile: ZipeScriptTransform = async (c, fp, o) => {
    //   // cache.has(fp);
    //   rewriteImports(c, resolver.requestToFile(fp), resolver);
    //   console.log("vite rewrite", resolver.requestToFile(fp));
    //   return {
    //     code: undefined,
    //     map: undefined,
    //   };
    // };

    const pipeline = buildOutputPipeline(dependencies, [moduleRewrite], {});

    let postcssConfig: any = undefined;
    const postcssConfigPromise = await loadPostcssConfig(root).then((x) => {
      postcssConfig = x as any;
    });

    postcssConfig = await loadPostcssConfig(root);

    const transforms = { ...scriptTransforms, ...ViteTransformers };

    const sfcParser = buildSFCParser(root, {
      compiler: resolveCompiler(root) as any,
      sfc: {
        sourceMap: true,
      },
      style: {
        preprocessCustomRequire: (id: string) => require(resolve(root, id)),
        ...(postcssConfig
          ? {
              postcssOptions: postcssConfig.options,
              postcssPlugins: postcssConfig.plugins,
            }
          : {}),
      },
      template: {
        compilerOptions: {
          runtimeModuleName: "/@modules/vue",
        },
        preprocessCustomRequire: (id: string) => require(resolve(root, id)),
      },
      transformOptions: {
        sourcemap: true,
        root,
      },
    });

    watcher.on("change", async (p) => {
      const requestFile = resolver.fileToRequest(p);
      if (dependencies.has(requestFile)) {
        dependencies.delete(requestFile);
        await parse(
          requestFile,
          "/",
          moduleResolver,
          cache,
          dependencies,
          sfcParser,
          transforms
        );
      }
    });

    const builder: ZipeBuilder = async (
      component,
      context,
      appUses?: AppEnhancement[]
    ) => {
      await postcssConfigPromise;

      return outputSSR(
        component,
        moduleResolver,
        cache,
        dependencies,
        sfcParser,
        pipeline,
        transforms,
        [],
        appUses ?? [],
        context
      );
    };

    return plugin({
      ...ctx,
      zipeSSR: builder,
    });
  };
}
