import { ModuleResolver, ZipeCache } from "./next";
import { ZipeParser } from "./next/parser";
import {
  ZipeScriptTransform,
  ZipeScriptTransformOptions,
} from "./next/transformers";
import { ZipeModule, parse, ZipeDependency } from "./next/parse";
import { externalModuleRewrite } from "./next/transformers/externalModuleRewrite";
import { externalModuleRewriteSSR } from "./next/transformers/externalModuleRewriteSSR";
import { filePathToVar } from "./utils";
import { renderToString } from "@vue/server-renderer";
import { renderToSSRApp } from "./ssrTemplate";
import { createSSRApp, createApp } from "vue";
import hash_sum from "hash-sum";

export async function outputSSR(
  filePath: string,
  resolver: ModuleResolver,
  fileCache: ZipeCache,
  dependenciesCache: ZipeCache,
  sfcParser: ZipeParser,
  pipeline: (module: ZipeModule, ssr: boolean) => Promise<string>,
  scriptTransforms: Record<string, ZipeScriptTransform>,
  outputTransforms: ZipeScriptTransform[]
): Promise<string> {
  const start = Date.now();

  const module = await parse(
    filePath,
    "/",
    resolver,
    fileCache,
    dependenciesCache,
    sfcParser,
    scriptTransforms
  );
  const deps = await module.dependenciesPromise;

  let [script, ssrRawScript] = await Promise.all([
    pipeline(module, false),
    pipeline(module, true),
  ]);

  const ssrTransforms = [externalModuleRewriteSSR, ...outputTransforms];
  const clientTransforms = [externalModuleRewrite, ...outputTransforms];

  const [ssrScript, clientScript] = await Promise.all([
    runTransforms(
      ssrRawScript,
      filePath,
      {},
      {
        filePathToVar,
        module,
      },
      ssrTransforms
    ),
    runTransforms(
      script,
      filePath,
      {},
      {
        filePathToVar,
        module,
      },
      clientTransforms
    ),
  ]);

  const appName = filePathToVar(filePath);
  const external = module.fullDependencies.filter((x) => x.info.module);
  const htmlOutput = await renderApp(
    ssrScript,
    appName,
    external,
    filePathToVar
  );

  // console.log("deps", deps?.length);
  // console.log(';ssss', deps?.map(x=>x.sfc.descriptor?.styles))
  const styles =
    deps
      ?.filter((x) => x.sfc.descriptor?.styles.length ?? 0 > 0)
      .map((x) =>
        x.sfc.styles.map((s, i) => {
          const id = hash_sum(x.name);
          const href = x.module.path + `?type=style&index=${i}`;

          return {
            id,
            href,
          };
        })
      )
      .flat() ?? [];

  const html = renderToSSRApp(
    htmlOutput,
    appName,
    filePathToVar("/@modules/vue"),
    clientScript,
    styles
  );
  console.log(`${filePath} SSR in ${Date.now() - start}ms.`);

  return html;
}

async function runTransforms(
  code: string,
  filePath: string,
  options: Partial<ZipeScriptTransformOptions>,
  extra: Record<string, any>,
  transforms: ZipeScriptTransform[]
): Promise<string> {
  for (const transform of transforms) {
    const t = await transform(code, filePath, options, extra);
    code = t.code;
  }
  return code;
}

async function renderApp(
  script: string,
  appName: string,
  externalDependencies: ZipeDependency[],
  filePathToVar: (s: string) => string
): Promise<string> {
  const externalModules: Map<string, string> = new Map();
  const start = Date.now();
  try {
    for (const d of externalDependencies) {
      externalModules.set(d.info.name, filePathToVar(d.info.path));
    }
    const resolved = await Promise.all(
      [...externalModules.keys()].map((x) => import(x))
    );

    const xxx = new Function(
      ...[...externalModules.values()].map((x) => x),
      `${script}\n return ${appName}`
    );

    const component = xxx(...resolved);
    const app = renderToString(createSSRApp(component));
    console.log(`${appName} render SSR in ${Date.now() - start}ms.`);

    return app;
  } catch (xx) {
    console.error(xx, script);
    console.log("externalModules", externalModules);
    return `<div>
      <p style="color:red">ERROR</p>
      <p>${xx}</p>
      <textarea cols=500 rows=500>
        ${script}
      </textarea>
      
    </div>`;
  }
}
