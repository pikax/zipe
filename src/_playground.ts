import { createServer as createViteServer, Plugin, ServerPlugin } from "vite";
import { ssrBuild } from "./ssrBuild";

import * as viteZipe from "./vite";
import { parse as zipeParse, ZipeModule } from "./next/parse";
import { buildMemoryCache } from "./next/cache";
import { buildSFCParser } from "./next/parsers/sfcParser";
import { resolveCompiler, loadPostcssConfig, readBody } from "vite/dist/utils";
import resolve from "resolve-from";
import { posix } from "path";
import { scriptTransforms } from "./next/transformers";
import { scriptTransforms as ViteTransformers } from "./vite/transformers";
import { init } from "es-module-lexer";
import { scriptBuilder } from "./next/scriptBuilder";
import { filePathToVar } from "./utils";
import { buildOutputPipeline } from "./next/outputPipeline";
import { moduleRewrite } from "./next/transformers/moduleRewrite";
import { outputSSR } from "./outputSSR";
// let port = 4242;

// // console.log("root", process.cwd());
// // require("../dist").
// createServer({
//   // root: path.join(__dirname, "../playground"),
//   root: process.cwd(),
// })
//   .then((server) => {
//     server.listen(port, () => {
//       console.log(`listening at http://localhost:${port}`);
//     });
//   })
//   .catch((err) => {
//     console.error(`failed to start server. error:\n`, err);
//   });

// export async function createServer(options = {}) {
//   return createViteServer({
//     ...options,
//     plugins: [
//       createZipePrerender({
//         // component: "/playground/index.vue",
//         component: "/App.vue",
//       }),
//     ],
//     resolvers: [],
//   });
// }

const zipePlugin: ServerPlugin = ({
  root, // project root directory, absolute path
  app, // Koa app instance
  resolver, // resolve file
  server, // raw http server instance
  watcher, // chokidar file watcher instance
}) => {
  const cache = viteZipe.buildViteCache(resolver);
  const moduleResolver = viteZipe.buildViteModuleResolver(resolver, root);
  const dependencies = buildMemoryCache();

  const pipeline = buildOutputPipeline(dependencies, [moduleRewrite], {});

  app.use(async (ctx, next) => {
    await init;
    const postcssConfig = await loadPostcssConfig(root);

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

    if (ctx.path === "/output") {
      console.log("building output");
      const filePath = "/App.vue"; //resolver.requestToFile("/playground/App.vue"); // get the full path
      const o = await outputSSR(
        filePath,
        moduleResolver,
        cache,
        dependencies,
        sfcParser,
        pipeline,
        { ...scriptTransforms, ...ViteTransformers },
        []
      );

      ctx.body = o; //.replace("/@modules/", "");
      // ctx.body = "suop";
      return;
    }

    if (ctx.path === "/pipeline") {
      // const filePath = "/playground/App.vue"; //resolver.requestToFile("/playground/App.vue"); // get the full path
      const filePath = "/App.vue"; //resolver.requestToFile("/playground/App.vue"); // get the full path
      // const filePath = "/src/utils.ts"; //resolver.requestToFile("/playground/App.vue"); // get the full path
      const start = Date.now();
      // console.log("building", filePath);
      const ss = await zipeParse(
        filePath,
        "/",
        moduleResolver,
        cache,
        dependencies,
        sfcParser,
        { ...scriptTransforms, ...ViteTransformers }
      );
      const deps = await ss.dependenciesPromise;
      console.log(`${filePath} parsed in ${Date.now() - start}ms.`);

      const o = await pipeline(ss);

      ctx.body = o;

      console.log(`${filePath} served in ${Date.now() - start}ms.`);

      return;
    }

    if (ctx.path === "/") {
      // NOTE is is using the root folder
      const filePath = resolver.requestToFile("/playground/App.vue"); // get the full path
      const html = await ssrBuild(filePath, resolver, root, watcher); // build HTML
      ctx.body = html; //assign the html output
      return;
    }

    if (ctx.path === "/next") {
      // const filePath = "/playground/App.vue"; //resolver.requestToFile("/playground/App.vue"); // get the full path
      const filePath = "/App.vue"; //resolver.requestToFile("/playground/App.vue"); // get the full path
      // const filePath = "/src/utils.ts"; //resolver.requestToFile("/playground/App.vue"); // get the full path
      const start = Date.now();
      // console.log("building", filePath);
      const ss = await zipeParse(
        filePath,
        "/",
        moduleResolver,
        cache,
        dependencies,
        sfcParser,
        { ...scriptTransforms, ...ViteTransformers }
      );
      const deps = await ss.dependenciesPromise;
      console.log(`${filePath} parsed in ${Date.now() - start}ms.`);

      // const deps: ZipeModule[] = [
      //   ss,
      //   ...(ss.fullDependencies
      //     .filter((x) => !x.dynamic)
      //     .map((x) => dependencies.get<ZipeModule>(x.module))
      //     .filter(Boolean) as ZipeModule[]),
      // ];

      // ctx.body = deps!.map((x) =>
      //   scriptBuilder(x, dependencies, filePathToVar, true)
      // )[1];
      // ctx.body = [ss.dependencies, ss.fullDependencies];

      // ctx.body = deps![1];
      ctx.body = scriptBuilder(deps![1], dependencies, filePathToVar, true);

      console.log(`${filePath} served in ${Date.now() - start}ms.`);

      return;
    }
    await next();
  });
};

createViteServer({
  // root: process.cwd(),
  plugins: [zipePlugin],
}).listen(4242);
