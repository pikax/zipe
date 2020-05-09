import {
  ZipeDependency,
  DependencyPointer,
  resolveZipeDependency,
} from "./resolver/resolveZipeDependency";
import { init as initLexer } from "es-module-lexer";
import { Plugin } from "vite";
import { buildZipDependencyContent } from "./resolver/buildZipeDependencyContent";
import { renderZipeApp } from "./renderApp";
import { renderToSSRApp } from "./ssrTemplate";
import { FileDependency } from "./resolveTree";
import { ssrHTML } from "./ssrHTML";

export function createZipePrerender(options?: { component: string }): Plugin {
  options = options ?? { component: "/App.vue" };

  // Map<filePath, requestPath>
  const dependencyMap = new Map<string, Set<string>>();
  // Map<requestPath, body>
  const requestCache = new Map<string, string>();

  const dependencies = new Map<string, ZipeDependency>();

  return ({ app, root, watcher, resolver, server }) => {
    app.use(async (ctx, next) => {
      if (ctx.path === "/") {
        await initLexer;
        const externals = new Map<string, FileDependency>();

        const item = await resolveZipeDependency(
          resolver.requestToFile(options?.component ?? ""),
          resolver,
          dependencies,
          externals,
          root
        );

        // NOTE we can possibly use SSRContent
        const ssrContent = buildZipDependencyContent(
          item,
          dependencies,
          externals,
          true
        );
        const content = buildZipDependencyContent(
          item,
          dependencies,
          externals,
          false
        );
        const f = await renderZipeApp(ssrContent, resolver, externals);
        const html = renderToSSRApp(f, content);
        ctx.body = html;
        return;
      }

      await next();

      // if (ctx.path.endsWith(".html")) {
      //   console.log("html file", ctx.path, resolver.requestToFile(ctx.path));

      //   ssrHTML();
      // }
    });

    // on change rebuild the zipDependency
    watcher.on("change", async (p) => {
      const requestFile = resolver.fileToRequest(p);
      if (dependencies.has(requestFile)) {
        console.log("dep changed", requestFile);
        const prev = dependencies.get(requestFile)!;
        const externals = new Map<string, DependencyPointer>();
        console.log(prev);
        dependencies.delete(requestFile);
        await resolveZipeDependency(p, resolver, dependencies, externals, root);

        // ignore default vue module
        // const modules = prev.modules.filter(
        //   (x) => x.module !== "/@modules/vue"
        // );

        // let invalidateAll = false;
        // // if external changes, it needs to invalidate all the cached paths
        // if (externals.size !== modules.length) {
        //   invalidateAll = true;
        // } else {
        //   invalidateAll = modules.some((x) => !externals.has(x.module));
        // }

        // // NOTE not sure
        // if (invalidateAll) {
        //   console.log("invalidating all");
        // }

        // update prev object
        // prev.dependencies = update.dependencies;
        // prev.modules = prev.modules;
        // prev.content = update.content;
        // prev.internal = update.internal;

        const pathSet = dependencyMap.get(p)!;
        for (const outdatedPath of pathSet) {
          console.log("[cache] clearing cache", outdatedPath);
          requestCache.delete(outdatedPath);
        }
      }
    });
  };
}
