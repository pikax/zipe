import { ZipeModule } from "./parse";
import { ZipeCache } from "./cache";
import {
  ZipeScriptTransform,
  ZipeScriptTransformOptions,
} from "./transformers";
import { scriptBuilder } from "./scriptBuilder";
import { filePathToVar } from "../utils";
import chalk from "chalk";
const debug = require("debug")("vite:pipeline");
const debugTransform = require("debug")("vite:pipeline:transform");

export interface ZipeOutputPipeline {
  scriptPipeline: (
    module: ZipeModule,
    ssr: boolean
  ) => Promise<{ code: string; processed: Set<string> }>;
  dynamicImportPipeline: (
    module: ZipeModule,
    processed: Set<string>,
    includeOnly: Set<string> | null,
    ssr: boolean
  ) => Promise<{ code: string; processed: Set<string> }>;
}

// builds the final script
export function buildOutputPipeline(
  dependenciesCache: ZipeCache,
  transformers: ZipeScriptTransform[],
  options: Partial<ZipeScriptTransformOptions>,
  comments = true
): ZipeOutputPipeline {
  // TODO pipeline cache

  const scriptPipeline = async (module: ZipeModule, ssr: boolean) => {
    // NOTE probably await dependencies?
    const start = Date.now();
    let code = "";

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
      if (processed.has(script.module.path)) {
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

      processed.add(script.module.path);
    }

    // run transformers

    for (const transform of transformers) {
      const start = Date.now();
      const { code: transformed } = await transform(
        code,
        module.module.path,
        options,
        {
          modules: scripts,
          module,
          filePathToVar,
        }
      );
      if (transformed) code = transformed;

      debugTransform(`${module.name} transform in ${Date.now() - start}ms.`);
    }

    if (comments) {
      code = "\n\n// ZIPE APP start\n" + code + "\n\n// ZIPE APP end\n";
    }

    debug(`${module.name} outputed in ${Date.now() - start}ms.`);

    return { code, processed };
  };

  const dynamicImportPipeline = async (
    module: ZipeModule,
    processed: Set<string>,
    includeOnly: Set<string> | null,
    ssr: boolean
  ) => {
    // NOTE probably await dependencies?
    const start = Date.now();
    let code = "";

    const dynamicDeps = module.fullDependencies
      .filter((x) => x.dynamic)
      .filter((x) => !x.info.module);

    const scripts: ZipeModule[] = [
      module,
      ...(dynamicDeps
        .map((x) => dependenciesCache.get<ZipeModule>(x.info.path))
        .filter(Boolean) as any),
    ];

    if (scripts.length !== dynamicDeps.length + 1) {
      console.warn("[zipe] failed to find cached modules", {
        expected: dynamicDeps.map((x) => x.info.path),
        got: scripts.slice(1).map((x) => x.module.path),
      });
    }

    let include: { has(s: string): boolean } = includeOnly ?? {
      has: () => true,
    };

    // append scripts together
    for (let i = scripts.length - 1; i >= 0; --i) {
      const script = scripts[i];
      if (processed.has(script.module.path)) {
        continue;
      }

      const varName = filePathToVar(script.module.path);
      if (!include.has(varName)) {
        if (comments) {
          code += `\n//Dynamic import ${script.name}`;
        }
        // code += `\nlet ${varName} = ()=>zipeRawImport('${script.module.path}')`;
        code += `\nlet ${varName} = ()=>import('${script.module.path}')`;
        if (comments) {
          code += `\n// end Dynamic import ${script.name}`;
        }

        processed.add(script.module.path);
        continue;
      }

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

      processed.add(script.module.path);
    }

    for (const transform of transformers) {
      const start = Date.now();
      const { code: transformed } = await transform(
        code,
        module.module.path,
        options,
        {
          modules: scripts,
          module,
          filePathToVar,
        }
      );
      if (transformed) code = transformed;

      debugTransform(`${module.name} transform in ${Date.now() - start}ms.`);
    }

    debug(
      `${module.name} dynamic modules processed in ${Date.now() - start}ms.`
    );

    return {
      code,
      processed,
    };
  };

  return {
    scriptPipeline,
    dynamicImportPipeline,
  };
}
