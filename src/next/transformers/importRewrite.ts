import { ZipeScriptTransform } from "../transformers";
import { ZipeModule } from "../parse";

const debug = require("debug")("zipe:transform:importRewrite");

// rewrites `import` to ${varName} =
export const importRewrite: ZipeScriptTransform = async (
  content,
  filePath,
  option,
  extra: {
    // TODO better name
    filePathToVar: (s: string) => string;
    module?: ZipeModule;
  }
): Promise<{ code: string; map: string | undefined }> => {
  const module = extra.module;
  if (!module) {
    console.error(`[zipe] ImportRewrite: module not passed!`);
    return { code: content, map: undefined };
  }
  const filePathToVar = extra.filePathToVar;

  const start = Date.now();
  let code = content;
  let map = undefined;

  const externals = module.fullDependencies.filter((x) => x.info.module);

  // console.log("externals", { externals });
  for (const { info, importLine, importPath, dynamic } of externals) {
    const varName = filePathToVar(info.path);
    if (dynamic) {
      debug(`Rewriting dynamic import '${importPath}' to '${varName}'`);

      code = code.replace(`import${importPath}`, `zipeImport('${varName}')`);
      continue;
    }
    const expected = importLine
      .replace("import * as", "let")
      .replace("import", "let")
      .replace("from", "=")
      .replace(/ as /g, " : ")
      .replace(importPath, varName);
    code = code.replace(importLine, expected);
  }

  debug(`${filePath} external module rewrite SSR in ${Date.now() - start}ms.`);

  return {
    code,
    map,
  };
};
