import { init as initLexer } from "es-module-lexer";
import {
  ZipeDependency,
  resolveZipeDependency,
  DependencyPointer,
} from "./resolver/resolveZipeDependency";
import { InternalResolver } from "vite/dist/resolver";
import { HMRWatcher } from "vite/dist/server/serverPluginHmr";
import { FileDependency } from "./resolveTree";
import { buildZipDependencyContent } from "./resolver/buildZipeDependencyContent";
import { renderZipeApp } from "./renderApp";
import { renderToSSRApp } from "./ssrTemplate";

// Map<filePath, requestPath>
const dependencyMap = new Map<string, Set<string>>();
// Map<requestPath, body>
const requestCache = new Map<string, string>();

const dependencies = new Map<string, ZipeDependency>();

export async function ssrBuild(
  filePath: string,
  resolver: InternalResolver,
  root: string,
  watcher: HMRWatcher | undefined
): string {
  await initLexer;
  const externals = new Map<string, FileDependency>();

  // build dependencies
  const item = await resolveZipeDependency(
    filePath,
    resolver,
    dependencies,
    externals,
    root
  );

  // NOTE we can possibly reuse SSRContent
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
  const html = renderToSSRApp(f, content, item.styles);

  if (watcher) {
    watcher.on("change", async (p) => {
      const requestFile = resolver.fileToRequest(p);
      if (dependencies.has(requestFile)) {
        // console.log("dep changed", requestFile);
        const prev = dependencies.get(requestFile)!;
        const externals = new Map<string, DependencyPointer>();
        console.log(prev);
        dependencies.delete(requestFile);
        await resolveZipeDependency(p, resolver, dependencies, externals, root);

        const pathSet = dependencyMap.get(p);
        if (!pathSet) {
          return;
        }
        for (const outdatedPath of pathSet) {
          console.log("[cache] clearing cache", outdatedPath);
          requestCache.delete(outdatedPath);
        }
      }
    });
  } else {
    // clear all cache
    dependencyMap.clear();
    dependencies.clear();
  }

  return html;
}
