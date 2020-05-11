import { ZipeModule } from "./parse";
import { ZipeCache } from "./cache";
import {
  ZipeScriptTransform,
  ZipeScriptTransformOptions,
} from "./transformers";
import { scriptBuilder } from "./scriptBuilder";
import { filePathToVar } from "../utils";
const debug = require("debug")("vite:pipeline");
const debugTransform = require("debug")("vite:pipeline:transform");

// builds the final script
export function buildOutputPipeline(
  dependenciesCache: ZipeCache,
  transformers: ZipeScriptTransform[],
  options: Partial<ZipeScriptTransformOptions>,
  comments = true
) {
  // TODO pipeline cache

  return async (module: ZipeModule, ssr: boolean) => {
    // NOTE probably await dependencies?

    const start = Date.now();
    let code = "";

    // TODO dynamic dependencies
    const internalDeps = module.fullDependencies
      .filter((x) => !x.dynamic)
      .filter((x) => !x.info.module);

    const scripts: ZipeModule[] = [
      module,
      ...(internalDeps
        .map((x) => dependenciesCache.get<ZipeModule>(x.info.path))
        .filter(Boolean) as any),
    ];

    if (scripts.length !== internalDeps.length + 1) {
      console.warn("[zipe] failed to find cached modules", {
        expected: internalDeps.map((x) => x.info.path),
        got: scripts.slice(1).map((x) => x.module.path),
      });
    }

    const processed = new Set<string>();
    // append scripts together
    for (let i = scripts.length - 1; i >= 0; --i) {
      const script = scripts[i];
      if (processed.has(script.name)) {
        continue;
      }
      // console.log("script", script.name, ssr);
      const snippet = scriptBuilder(
        scripts[i],
        dependenciesCache,
        filePathToVar,
        ssr,
        comments
      );

      if (comments) {
        code += `\n// start ${script.name} \n`;
      }

      code += `${snippet}`;

      if (comments) {
        code += `\n// end ${script.name} \n`;
      }

      processed.add(script.name);
    }

    // run transformers

    for (const transform of transformers) {
      const start = Date.now();
      const { code: transformed } = await transform(
        code,
        module.name,
        options,
        {
          modules: scripts,
          module,
          filePathToVar,
        }
      );
      code = transformed;

      debugTransform(`${module.name} transform in ${Date.now() - start}ms.`);
    }

    if (comments) {
      code = "\n\n// ZIPE APP start\n" + code + "\n\n// ZIPE APP end\n";
    }

    debug(`${module.name} outputed in ${Date.now() - start}ms.`);

    return code;
  };
}
