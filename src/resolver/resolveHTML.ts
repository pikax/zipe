// import { ImportReplacer, replaceImports } from "./replaceImports";
// import { processSFC } from "./processSFC";
// import { InternalResolver } from "vite/dist/resolver";
// import { buildScript } from "./buildScripts";
// import { ZipeDependency } from "./resolveZipeDependency";
// import { cachedRead } from "vite";

// export async function resolveHTML(
//   item: ZipeDependency,
//   root: string,
//   replacer: ImportReplacer,
//   resolver: InternalResolver
// ): Promise<string> {
//   const content = await cachedRead(null, item.filePath);
//   // TODO styles
//   // const { script: rawScript, template: rawTemplate } = await processSFC(
//   //   content,
//   //   item.filePath,
//   //   root
//   // );

//   // // NOTE should do something with the import information??

//   // const [script] = replaceImports(
//   //   rawScript,
//   //   resolver,
//   //   replacer,
//   //   null as any // magic
//   // );

//   // const [template] = replaceImports(
//   //   rawTemplate,
//   //   resolver,
//   //   replacer,
//   //   null as any // magic
//   // );

//   let lastScriptIndex = 0;

//   while (lastScriptIndex >= 0) {
//     const openScriptIndex = content.indexOf("<script", lastScriptIndex);
//     const closeScriptIndex = content.indexOf("</script>", openScriptIndex);

//     // NOTE not so good guess
//     const startContent = content.indexOf(">", openScriptIndex) + 1;

//     let scriptContent = content.slice(startContent, closeScriptIndex);

//     // if not app, ignore
//     if (scriptContent.indexOf("createApp") === -1) {
//       continue;
//     }

//     // if()

//     lastScriptIndex = closeScriptIndex;
//   }

//   return buildScript(item, script, template, );
// }
