import { InternalResolver } from "vite/dist/resolver";
import { createApp } from "vue";
import { renderToString } from "@vue/server-renderer";
import { DependencyPointer } from "./resolver/resolveZipeDependency";

export async function renderZipeApp(
  script: string,
  resolver: InternalResolver,
  externalDependencies: Map<string, DependencyPointer>
): Promise<string> {
  // TODO improve module resolving
  const externalModules: [string, string][] = [];
  try {
    for (const [k, e] of externalDependencies) {
      // TODO do better
      const moduleName = e.module.replace("/@modules/", "");
      externalModules.push([moduleName, k]);
    }
    const init = Date.now();

    // load modules, if the modules not exist try to load from the web_modules
    const resolved = await Promise.all(
      externalModules.map(
        (x) => import(x[0]) //.catch((_) => import(`../web_modules/${x[0]}`))
      )
    );

    const end = Date.now();
    console.log("resolving external: ", end - init);

    const xxx = new Function(...externalModules.map((x) => x[1]), script);

    const component = xxx(...resolved);
    const app = renderToString(createApp(component));

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
