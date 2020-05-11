import { init as initLexer } from "es-module-lexer";
import {
  ZipeDependency,
  resolveZipeDependency,
  DependencyPointer,
} from "./resolver/resolveZipeDependency";
import { InternalResolver } from "vite/dist/resolver";
import { HMRWatcher } from "vite/dist/server/serverPluginHmr";
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
): Promise<string> {
  await initLexer;
  const externals = new Map<string, DependencyPointer>();

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


  return html;
}


