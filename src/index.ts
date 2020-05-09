import path from "path";
import {
  createServer as createViteServer,
  cachedRead,
  Plugin,
  ServerConfig,
} from "vite";
import { renderZipeApp } from "./renderApp";

import { renderToString } from "@vue/server-renderer";
import {
  createApp,
  defineAsyncComponent,
  h,
  defineComponent,
  createSSRApp,
} from "vue";
import {
  parse,
  SFCTemplateBlock,
  SFCStyleBlock,
  compileTemplate,
} from "@vue/compiler-sfc";
import { resolveCompiler } from "vite/dist/utils";
import { InternalResolver } from "vite/dist/resolver";
import { init as initLexer, parse as parseImports } from "es-module-lexer";
import {
  moduleRewritePlugin,
  rewriteImports,
  rewriteCache,
} from "vite/dist/server/serverPluginModuleRewrite";
import { hmrClientId } from "vite/dist/server/serverPluginHmr";
import {
  resolveTree,
  resolvedTreeToContent,
  FileItem,
  FileDependency,
} from "./resolveTree";
import { renderToSSRApp } from "./ssrTemplate";

function createVitePreRender(): Plugin {
  // Map<filePath, requestPath>
  const dependencyMap = new Map<string, Set<string>>();
  // Map<requestPath, body>
  const requestCache = new Map<string, string>();

  const dependencies = new Map<string, FileItem>();

  return ({ app, root, watcher, resolver, server }) => {
    app.use(async (ctx, next) => {
      if (requestCache.has(ctx.path)) {
        console.log("using cache");
        ctx.body = requestCache.get(ctx.path);
        return;
      }
      if (ctx.path === "/") {
        await initLexer;
        const externals = new Map<string, FileDependency>();

        const item = await resolveTree(
          resolver.requestToFile("./playground/index.vue"),
          resolver,
          dependencies,
          externals
        );

        // NOTE we can possibly use SSRContent
        const ssrContent = resolvedTreeToContent(
          item,
          dependencies,
          externals,
          true
        );
        const content = resolvedTreeToContent(
          item,
          dependencies,
          externals,
          false
        );
        const f = await renderZipeApp(ssrContent, resolver, externals);
        const html = renderToSSRApp(f, content);
        ctx.body = html;

        // cache stuff
        requestCache.set(ctx.path, html);

        for (const d of dependencies.keys()) {
          const dependencyPath = resolver.requestToFile(d);

          if (!dependencyMap.has(dependencyPath)) {
            dependencyMap.set(dependencyPath, new Set());
          }

          const s = dependencyMap.get(dependencyPath)!;
          s.add(ctx.path);
        }
        return;
      } else {
        return next();
      }
    });

    watcher.on("change", async (p) => {
      const requestFile = resolver.fileToRequest(p);
      if (dependencies.has(requestFile)) {
        console.log("dep changed", requestFile);
        const prev = dependencies.get(requestFile)!;
        const externals = new Map<string, FileDependency>();
        console.log(prev);
        dependencies.delete(requestFile);
        const update = await resolveTree(p, resolver, dependencies, externals);

        const modules = prev.modules.filter(
          (x) => x.module !== "/@modules/vue"
        );

        let invalidateAll = false;
        // if external changes, it needs to invalidate all the cached paths
        if (externals.size !== modules.length) {
          invalidateAll = true;
        } else {
          invalidateAll = modules.some((x) => !externals.has(x.module));
        }

        // NOTE not sure
        if (invalidateAll) {
          console.log("invalidating all");
        }

        prev.dependencies = update.dependencies;
        prev.modules = prev.modules;
        prev.content = update.content;
        prev.internal = update.internal;

        const pathSet = dependencyMap.get(p)!;
        for (const outdatedPath of pathSet) {
          console.log("[cache] clearing cache", outdatedPath);
          requestCache.delete(outdatedPath);
        }
      }
    });
  };
}

export async function createServer(options: ServerConfig = {}) {
  return createViteServer({
    ...options,
    plugins: [createVitePreRender()],
    resolvers: [],
  });
}
