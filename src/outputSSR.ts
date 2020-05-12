import { ModuleResolver, ZipeCache } from "./next";
import { ZipeParser } from "./next/parser";
import {
  ZipeScriptTransform,
  ZipeScriptTransformOptions,
} from "./next/transformers";
import { ZipeModule, parse, ZipeDependency } from "./next/parse";
import { externalModuleRewrite } from "./next/transformers/externalModuleRewrite";
import { externalModuleRewriteSSR } from "./next/transformers/externalModuleRewriteSSR";
import { filePathToVar, stringToRegex } from "./utils";
import { renderToSSRApp } from "./ssrTemplate";
import hash_sum from "hash-sum";
import chalk from "chalk";
import { ZipeOutputPipeline } from "./next/outputPipeline";
import { resolveImport } from "./resolveImport";
import { renderToString } from "@vue/server-renderer";
import { parseImportsExports } from "./parseImports";
import { BaseRequest } from "koa";
import { App, createSSRApp } from "vue";

export interface AppEnhancement<T = any> {
  importLine: string;
  enhance: (app: App<Element>, dependency: T) => void | any;
  ssr?: (
    app: App<Element>,
    dependency: T,
    ctx: { request: BaseRequest }
  ) => Promise<void> | void;
}

export async function outputSSR(
  filePath: string,
  resolver: ModuleResolver,
  fileCache: ZipeCache,
  dependenciesCache: ZipeCache,
  sfcParser: ZipeParser,
  { scriptPipeline, dynamicImportPipeline }: ZipeOutputPipeline,
  scriptTransforms: Record<string, ZipeScriptTransform>,
  outputTransforms: ZipeScriptTransform[],
  appEnhancements: AppEnhancement[],
  app: { request: BaseRequest }
): Promise<string> {
  const start = Date.now();

  const zipeModule = await parse(
    filePath,
    "/",
    resolver,
    fileCache,
    dependenciesCache,
    sfcParser,
    scriptTransforms
  );
  const deps = (await zipeModule.dependenciesPromise) || [];

  if ((zipeModule as any).appEnhancements) {
    appEnhancements = (zipeModule as any).appEnhancements;
  } else if (appEnhancements.length > 0) {
    (zipeModule as any).appEnhancements = appEnhancements;
    // console.log("adding dependencies");
    const depsPromises: Promise<ZipeModule[]>[] = [];
    const eee: ZipeModule[] = [];
    for (const enhancement of appEnhancements) {
      const dep = parseImportsExports(enhancement.importLine, "/", resolver)[0];
      if (dep.length > 1) {
        console.error(
          "[zipe] found more than one import, only one import is supported"
        );
      }

      console.log("found", dep);
      //console.adding dependencies
      zipeModule.fullDependencies.unshift(dep[0]);
      zipeModule.dependencies.unshift(dep[0]);
      const dd = ((enhancement as any).__dep = dep[0]);

      if (!dependenciesCache.has(dd.info.path)) {
        const m = await parse(
          dep[0].info.path,
          "/",
          resolver,
          fileCache,
          dependenciesCache,
          sfcParser,
          scriptTransforms
        );
        if (m.dependenciesPromise) depsPromises.push(m.dependenciesPromise);

        eee.push(m);
      } else {
        const m: ZipeModule = dependenciesCache.get(dd.info.path) as any;
        zipeModule.fullDependencies.push(...m.fullDependencies);
      }
    }
    await Promise.all(depsPromises);
    for (const i of eee) {
      zipeModule.fullDependencies.push(...i.fullDependencies);
    }
  }

  let [rawScriptPipeline, ssrRawScript] = await Promise.all([
    scriptPipeline(zipeModule, false),
    scriptPipeline(zipeModule, true).then((x) => {
      return dynamicImportPipeline(zipeModule, x.processed, null, true).then(
        ({ code, processed }) => {
          if (!code) {
            return x.code;
          }
          const cacheName = `__cached_zipe_import`;
          const d = `
      let ${cacheName};
      function zipeImport(name){
        // notify the server about the imports
        __zipe_dynamic_importer_call(name);
        if(${cacheName}){
          return ${cacheName}[name]
        }

        ${code}

        ${cacheName} = {
          ${[...new Set(processed)]
            .map(filePathToVar)
            .map((p) => `${p}: Promise.resolve(${p})`)}
        }
        return ${cacheName}[name]
      }
      // end dynamic import
      `;
          return `${d}\n${x.code}`;
        }
      );
    }),
  ]);

  const resolvedDynamicImports = new Set<string>();
  const resolveDynamicImport = (s: string) => resolvedDynamicImports.add(s);

  const ssrTransforms = [externalModuleRewriteSSR, ...outputTransforms];
  const clientTransforms = [externalModuleRewrite, ...outputTransforms];

  const appName = filePathToVar(filePath);
  const external = zipeModule.fullDependencies.filter((x) => x.info.module > 0);

  let enhanceClient = "";
  let enhanceImports = "";
  if (appEnhancements.length) {
    for (const enhancement of appEnhancements) {
      const dep = (enhancement as any).__dep as ZipeDependency;
      const name = filePathToVar(dep.info.path);

      // enhance
      if (enhancement.enhance) {
        let en = enhancement.enhance.toString();

        const m = en.match(/(?:enhance|\:\s?)\((\w+)(?:, (\w+)){1,}\)/i);
        if (!m || m.length === 0) {
          console.warn(chalk.yellow("[zipe] invalid enhancement provided"));
          continue;
        }

        // scope
        enhanceClient += `{
        ${m[1].indexOf(":") >= 0 ? "const enhance = " : "function "}${en}
        enhance(app, ${name})
      }`;
      }

      if (dep.info.module === 0) {
        // console.log("module type", dep.info);
        const expected = enhancement.importLine
          .replace("import * as", "let")
          .replace("import", "let")
          .replace("from", "=")
          .replace(/ as /g, " : ")
          .replace(enhancement.importLine, name);
        enhanceImports += expected + "\n";
      } else {
        enhanceImports += enhancement.importLine + "\n";
      }
    }

    enhanceClient = `function applyZipeEnhancements(app){
      ${enhanceClient}
    }`;
  }

  // TODO transforms for server and client should run in parallel
  // if there's no dynamic import

  const htmlAppOutput = await runTransforms(
    ssrRawScript,
    filePath,
    {},
    {
      filePathToVar,
      module: zipeModule,
    },
    ssrTransforms
  ).then((ssrScript) => {
    return renderApp(
      ssrScript,
      appName,
      external,
      filePathToVar,
      resolveDynamicImport,
      appEnhancements,
      app
    );
  });

  const dynamicImportClient = async () => {
    const { code, processed } = await dynamicImportPipeline(
      zipeModule,
      rawScriptPipeline.processed,
      resolvedDynamicImports,
      false
    );
    const cacheName = `__cached_zipe_import`;
    const d = `
      let ${cacheName};
      function zipeImport(name){
        if(${cacheName}){
          return ${cacheName}[name]
        }

        ${code}

        ${cacheName} = {
          ${[...new Set(processed)]
            .map(filePathToVar)
            .map((p) => `${p}: Promise.resolve(${p})`)}
        }
        return ${cacheName}[name]
      }`;

    return d;
  };
  const xxx = await dynamicImportClient();
  // console.log('dxdada', xxx)
  let clientScript = `${xxx}\n${enhanceImports}\n${rawScriptPipeline.code}\n${enhanceClient}\n`;

  // console.log(enhanceImports);
  clientScript = await runTransforms(
    clientScript,
    filePath,
    {},
    {
      filePathToVar,
      module: zipeModule,
    },
    clientTransforms
  );

  // console.log(enhanceImports);

  // const htmlOutput = await

  // console.log(chalk.red("used imports: ", ...resolvedDynamicImports));
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
  styles.push(...zipeModule.extra.styles);
  // console.log("styles deps", zipeModule.extra.styles);

  styles.push(
    ...zipeModule.fullDependencies
      .map((x) => dependenciesCache.get(x.info.path) as ZipeModule)
      .filter(Boolean)
      .map((x) => x.extra.styles)
      .flat()
  );

  // append the createApp
  const containerId = "app";
  const isDev: boolean = true;
  {
    clientScript += `const app = ${filePathToVar(
      "/@modules/vue"
    )}.createSSRApp(${appName})
    ${enhanceClient ? "applyZipeEnhancements(app);" : ""}
    app.mount("#${containerId}");`;

    // prepend updateStyle HMR
    if (isDev) {
      clientScript = `import { updateStyle } from "/vite/hmr"\n${clientScript}`;
    }
  }

  try {
    let { code: scriptOutput } = await scriptTransforms.js(
      clientScript,
      filePath,
      {
        target: "es6",
        minify: !isDev,
        define: {
          __DEV__: isDev.toString(),
        },
      }
    );
    clientScript = scriptOutput || clientScript;
  } catch (e) {
    console.error(chalk.bgRed("Error transforming script"), e);
  }

  const html = renderToSSRApp(htmlAppOutput, clientScript, containerId, styles);
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
    code = t.code ?? code;
  }
  return code;
}

async function renderApp(
  script: string,
  appName: string,
  externalDependencies: ZipeDependency[],
  filePathToVar: (s: string) => string,
  dynamicImports: (n: string) => void,
  appEnhancements: AppEnhancement[],
  ctx: { request: BaseRequest }
): Promise<string> {
  const externalModules: Map<string, string> = new Map();
  const extraVars: Map<string, any> = new Map();
  const start = Date.now();
  try {
    for (const { info } of externalDependencies) {
      if (info.module === 2) {
        console.warn(
          chalk.yellow(
            `[zipe] web_modules are not supported by the server, falling back to node_module, ${info.name}`
          )
        );
      }
      externalModules.set(info.name, filePathToVar(info.path));
    }

    const componentMap: Record<string, any> = {};

    extraVars.set("__zipe_dynamic_importer_call", dynamicImports);
    extraVars.set("__DEV__", process.env.NODE_ENV !== "production");
    extraVars.set("_____zipe_components", componentMap);

    const resolved = await Promise.all(
      [...externalModules.keys()].map((x) => require(x))
    );

    const serverApp = new Function(
      ...[...externalModules.values(), ...extraVars.keys()],
      `${script}\n return ${appName}`
    );

    const component = serverApp(...[...resolved, ...extraVars.values()]);

    const app = createSSRApp(component);

    for (const enhancement of appEnhancements) {
      const d = (enhancement as any).__dep as ZipeDependency;
      const n = filePathToVar(d.info.path);

      const mod: any = componentMap[n];

      if (!mod) {
        console.error("module not found", {
          n,
          componentMap,
        });
      }
      if (enhancement.enhance) {
        await enhancement.enhance(app as any, mod);
      }
      if (enhancement.ssr) {
        await enhancement.ssr(app, mod, ctx);
      }
    }

    const rendered = await renderToString(app);

    console.log(`${appName} render SSR in ${Date.now() - start}ms.`);

    return rendered;
  } catch (xx) {
    console.error(xx);
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

// async function renderClientApp( script: string,
//   appName: string,
//   externalDependencies: ZipeDependency[],
//   filePathToVar: (s: string) => string)
