import { ZipeScriptTransform } from "../transformers";
import { ZipeModule } from "../parse";
const debug = require("debug")("zipe:transform:moduleRewrite");

// rewrites the modules to variables
export const moduleRewrite: ZipeScriptTransform = async (
  content,
  filePath,
  option,
  extra: {
    // TODO better name
    filePathToVar: (s: string) => string;
    module?: ZipeModule;
    modules?: ZipeModule[];
  }
): Promise<{ code: string; map: string | undefined }> => {
  const modules = extra.modules;
  if (!modules || modules.length === 0) {
    console.error(`[zipe] ModuleRewrite: modules not passed!`);
    return { code: content, map: undefined };
  }
  const module = extra.module;
  if (!module) {
    console.error(`[zipe] ModuleRewrite: module not passed!`);
    return { code: content, map: undefined };
  }
  const filePathToVar = extra.filePathToVar;

  const start = Date.now();
  let code = content;
  let map = undefined;

  // const externals = module.fullDependencies.filter((x) => x.module);
  const internals = module.fullDependencies.filter((x) => !x.info.module);

  for (const { info, importLine, importPath } of internals) {
    const varName = filePathToVar(info.path);
    const expected = importLine
      .replace("import * as", "let")
      .replace("from", "=")
      .replace("import", "let")
      .replace(/ as /g, " : ")
      .replace(importPath, varName);
    code = code.replace(importLine, expected);
  }

  debug(`${filePath} module rewrite in ${Date.now() - start}ms.`);

  return {
    code,
    map,
  };
};
