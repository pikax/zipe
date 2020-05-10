import { createServer as createViteServer, Plugin } from "vite";
import { ssrBuild } from "./ssrBuild";

import * as viteZipe from "./vite";
import { parse as zipeParse } from "./next/parse";
import { buildMemoryCache } from "./next/cache";
import { buildSFCParser } from "./next/parsers/sfcParser";
import { resolveCompiler, loadPostcssConfig } from "vite/dist/utils";
import resolve from "resolve-from";
import { posix } from "path";
import { scriptTransforms } from "./next/transformers";
import { scriptTransforms as ViteTransformers } from "./vite/transformers";
import { init } from "es-module-lexer";
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

const zipePlugin: Plugin = ({
  root, // project root directory, absolute path
  app, // Koa app instance
  resolver, // resolve file
  server, // raw http server instance
  watcher, // chokidar file watcher instance
}) => {
  const cache = viteZipe.buildViteCache(resolver);
  const moduleResolver = viteZipe.buildViteModuleResolver(resolver, root);
  const dependencies = buildMemoryCache();

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
      console.log(`${filePath} served in ${Date.now() - start}ms.`);

      ctx.body = ss;
      return;
    }
    await next();
  });
};

createViteServer({
  // root: process.cwd(),
  plugins: [zipePlugin],
}).listen(4242);
