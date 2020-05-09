import { ImportReplacer, replaceImports } from "./replaceImports";
import { processSFC, StyleHeader } from "./processSFC";
import { InternalResolver } from "vite/dist/resolver";
import { buildScript } from "./buildScripts";
import { ZipeDependency } from "./resolveZipeDependency";
import { cachedRead } from "vite";

export async function resolveSFC(
  item: ZipeDependency,
  root: string,
  replacer: ImportReplacer,
  resolver: InternalResolver
): Promise<{ content: string; styles: StyleHeader[] }> {
  const content = await cachedRead(null, item.filePath);
  // console.log("resolvcSFC", content.length);
  const {
    script: rawScript,
    template: rawTemplate,
    styles,
    scopeId,
  } = await processSFC(content, item.relativePath, root);

  // console.log("proceed", {
  //   rawScript,
  //   rawTemplate,
  //   fp: item.filePath,
  // });

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

  const scriptContent = buildScript(item, script, template, scopeId, styles);

  return {
    content: scriptContent,
    styles,
  };
}
