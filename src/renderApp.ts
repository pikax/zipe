import { FileDependency } from "./resolveTree";
import { InternalResolver } from "vite/dist/resolver";
import { createApp } from "vue";
import { renderToString } from "@vue/server-renderer";

export async function renderZipeApp(
  script: string,
  resolver: InternalResolver,
  externalDependencies: Map<string, FileDependency>
): Promise<string> {
  console.log("k", externalDependencies.keys());

  // TODO improve module resolving
  const externalModules: [string, string][] = [];

  for (const [k, e] of externalDependencies) {
    // console.log("pth", e, e.module));

    // TODO do better
    const moduleName = e.module.replace("/@modules/", "");
    externalModules.push([moduleName, k]);
    // externalModules.push(import())

    // script = script.replace(e.importPath, k)
  }

  const resolved = await Promise.all(externalModules.map((x) => import(x[0])));
  const xxx = new Function(...externalModules.map((x) => x[1]), script);

  console.log("external modules", externalModules);

  const component = xxx(...resolved);
  const app = renderToString(createApp(component));

  return app;
}
