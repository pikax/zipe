import { ImportReplacer, replaceImports } from "./replaceImports";
import { processSFC } from "./processSFC";
import { InternalResolver } from "vite/dist/resolver";
import { buildScript } from "./buildScripts";
import { ZipeDependency } from "./resolveZipeDependency";
import { cachedRead } from "vite";

export async function resolveSFC(
  item: ZipeDependency,
  root: string,
  replacer: ImportReplacer,
  resolver: InternalResolver
): Promise<string> {
  const content = await cachedRead(null, item.filePath);
  console.log("resolvcSFC", content.length);
  // TODO styles
  const { script: rawScript, template: rawTemplate } = await processSFC(
    content,
    item.filePath,
    root
  );

  console.log("proceed", {
    rawScript,
    rawTemplate,
    fp: item.filePath,
  });

  // NOTE should do something with the import information??

  const [script] = replaceImports(
    rawScript,
    resolver,
    replacer,
    null as any // magic
  );

  const [template] = replaceImports(
    rawTemplate,
    resolver,
    replacer,
    null as any // magic
  );

  return buildScript(item, script, template);
}
