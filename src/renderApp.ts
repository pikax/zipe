import { FileDependency } from "./resolveTree";
import { InternalResolver } from "vite/dist/resolver";
import { createApp } from "vue";
import { renderToString } from "@vue/server-renderer";

export async function renderZipeApp(
  script: string,
  resolver: InternalResolver,
  externalDependencies: Map<string, FileDependency>
): Promise<string> {
  // TODO improve module resolving
  const externalModules: [string, string][] = [];

  for (const [k, e] of externalDependencies) {
    // TODO do better
    const moduleName = e.module.replace("/@modules/", "");
    externalModules.push([moduleName, k]);
  }

  try {
    const resolved = await Promise.all(
      externalModules.map((x) => import(x[0]))
    );
    const xxx = new Function(...externalModules.map((x) => x[1]), script);

    const component = xxx(...resolved);
    const app = renderToString(createApp(component));

    return app;
  } catch (xx) {
    console.error(xx);
    return `<div>
      <p style="color:red">ERROR</p>
      <p>${xx}</p>
      <textarea>
        ${script}
      </textarea>
      
    </div>`;
  }
}
