import { ZipeScriptTransform } from "../transformers";
import { ZipeModule } from "../parse";
const debug = require("debug")("zipe:transform:moduleRewrite");

// rewrites external modules to variables, client script
export const externalModuleRewrite: ZipeScriptTransform = async (
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
    console.error(`[zipe] ModuleRewrite: module not passed!`);
    return { code: content, map: undefined };
  }
  const filePathToVar = extra.filePathToVar;

  const start = Date.now();
  let code = content;
  let map = undefined;

  const externalUnique = new Set<string>();
  const externals = module.fullDependencies.filter((x) => x.info.module);

  for (const { info, importLine, importPath } of externals) {
    const varName = filePathToVar(info.path);
    const expected = importLine
      .replace("import * as", "let")
      .replace("from", "=")
      .replace("import", "let")
      .replace(/ as /g, " : ")
      .replace(importPath, varName);
    // store length
    const cl = code.length;
    code = code.replace(importLine, expected);

    // Only append replaced ones
    if (code.length !== cl) {
      externalUnique.add(info.path);
    }
  }

  code = `\n${[...externalUnique]
    .map((x) => `import * as ${filePathToVar(x)} from '${x}'`)
    .join(";\n")}\n${code}`;

  // console.log("inter", { internals });

  debug(`${filePath} external module rewrite in ${Date.now() - start}ms.`);

  return {
    code,
    map,
  };
};
