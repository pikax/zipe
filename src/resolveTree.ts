import path from "path";
import MagicString, { SourceMap } from "magic-string";
import { init as initLexer, parse as parseImports } from "es-module-lexer";
import {
  parse as sfcParse,
  compileTemplate,
} from "@vue/compiler-sfc";
import { InternalResolver } from "vite/dist/resolver";
import { cachedRead } from "vite";
import { rewriteImports } from "vite/dist/server/serverPluginModuleRewrite";
type SFCParseResult = ReturnType<typeof sfcParse>;

export interface FileDependency {
  // id: number;
  varName: string;

  // ./App.vue
  module: string;

  // './App.vue'
  importPath: string;

  // import {} from 'asdasd';
  importLine: string;

  isDynamic: boolean;

  isExternal: boolean;
}

export interface FileItem {
  // id: number;

  // global variable name
  varName: string;

  // relative path to root aka publicPath
  relativePath: string;

  // filename
  name: string;

  filePath: string;

  content: string;

  dependencies: FileDependency[];
  modules: FileDependency[];

  internal: {
    sfc?: SFCParseResult;
    content?: string;

    source: string;
  };
}

// export function resolveTreeFromRequest(importer: string, )

// TODO better name
export async function resolveTree(
  filePath: string,
  resolver: InternalResolver,
  processed: Map<string, FileItem>,
  external: Map<string, FileDependency>
): Promise<FileItem> {
  const relativePath = resolver.fileToRequest(filePath);
  console.log("re", { relativePath, filePath });
  // TODO share this
  const filePathToVar = (p: string) => "__" + p.replace(/[^0-9a-zA-Z_$]/g, "_");
  const externalToVar = (p: string) => "_" + filePathToVar(p) + "_";

  const varName = filePathToVar(relativePath);
  const name = path.basename(filePath);

  if (processed.has(relativePath)) {
    console.log("[skipping] processed file");
    const p = processed.get(relativePath)!;
    p.modules.forEach((x) => external.set(x.varName, x));
    return p;
  }

  const item: FileItem = {
    varName,

    // filename
    name,
    relativePath,

    filePath,

    content: null,

    dependencies: [],
    modules: [],

    internal: {
      sfc: undefined,
      content: undefined,

      source: undefined,
    },
  } as any;
  processed.set(relativePath, item);

  // file to content
  const fileContent = await cachedRead(null, filePath);

  if (filePath.endsWith(".vue")) {
    // TODO styles
    const { script: rawScript, template: rawTemplate } = await processSFC(
      fileContent,
      filePath
    );

    const replacer = (importLine: string, r: ReplaceImportResult): string => {
      // TODO check if this is actually correct
      const isExternal =
        r.module.startsWith("/@modules") || resolver.idToRequest(r.module)
          ? true
          : false;

      const varName = isExternal
        ? externalToVar(r.module)
        : filePathToVar(r.module);

      console.log("[replacing] dependency", r.module, "to", varName);

      if (isExternal) {
        item.modules.push({
          varName,
          isExternal,
          ...r,
        });
      } else {
        item.dependencies.push({
          varName,
          isExternal,
          ...r,
        });
      }

      if (isExternal) {
        // NOTE this will override current
        // TODO extract imports and append them somewhere
        external.set(varName, {
          varName,
          isExternal,
          ...r,
        });
      }

      // import { myVar, supa as myVar2 } from 'something'
      // to
      // let { myVar, supa: myVar2} = __something;

      return importLine
        .replace("import", "let")
        .replace("from", "=")
        .replace(/ as /g, " : ")
        .replace(r.importPath, varName);
    };

    // NOTE should do something with the import information??

    const [script] = replaceImports(
      rawScript,
      filePath,
      resolver,
      replacer,
      null as any // magic
    );

    const [template] = replaceImports(
      rawTemplate,
      filePath,
      resolver,
      replacer,
      null as any // magic
    );

    item.content = buildScript(item, script, template);
  }

  // TODO dependencies

  for (const dependency of item.dependencies) {
    if (dependency.isExternal) {
      console.log("[skipping] external", dependency.importPath);
      continue;
    }

    await resolveTree(
      resolver.requestToFile(dependency.module),
      resolver,
      processed,
      external
    );
  }

  return item;
}

// TODO styles
export function buildScript(item: FileItem, script: string, template: string) {
  const name = item.varName;

  let code = `let ${name}`;

  // start block
  code += "\n{";

  // script
  code += script.replace("export default", `${name} = `);

  // template
  code += template;

  code += `\n${name}.render = render`;

  code += `\n${name}.__hmrId = ${JSON.stringify(item.relativePath)}`;
  code += `\n${name}.__file = ${JSON.stringify(item.filePath)}`;

  // end block
  code += "\n}";

  return code;
}

interface ReplaceImportResult {
  // ./App.vue
  module: string;

  // './App.vue'
  importPath: string;

  // import {} from 'asdasd';
  importLine: string;

  isDynamic: boolean;
}

export function replaceImports(
  content: string,
  filePath: string, // TODO remove?
  resolver: InternalResolver,
  replacer: (importLine: string, r: ReplaceImportResult) => string,
  s: MagicString
): [string, ReplaceImportResult[]] {
  // TODO fix with magic string

  // TODO importer is always root??
  const rawScript = rewriteImports(content, "/", resolver);
  // TODO replace exports
  const [imports] = parseImports(rawScript);

  const result: ReplaceImportResult[] = [];

  let script = rawScript.toString();

  for (const item of imports) {
    const module = rawScript.slice(item.s, item.e);
    const itemResult = {
      module,
      importPath: rawScript.slice(item.s - 1, item.e + 1), // get ""
      importLine: rawScript.slice(item.ss, item.se),
      isDynamic: item.d !== -1,
    };
    result.push(itemResult);

    script = script.replace(
      itemResult.importLine,
      replacer(itemResult.importLine, itemResult)
    );
  }

  return [script, result];
}

interface ProcessSFCResult {
  sfc: SFCParseResult;

  template: string;
  script: string;
  styles: string;
}

export async function processSFC(
  content: string,
  publicPath: string
): Promise<ProcessSFCResult> {
  const item: ProcessSFCResult = {
    sfc: {},

    template: null,
    script: null,
    styles: null,
  } as any;

  // TODO add options information
  const sfc = (item.sfc = sfcParse(content));

  //TODO output errors

  // TODO use customBlocks?

  if (sfc.descriptor.template?.content) {
    const { code, map, errors } = compileTemplate({
      source: sfc.descriptor.template.content,
      filename: path.basename(publicPath),
      transformAssetUrls: {
        base: path.posix.dirname(publicPath),
      },
      // todo rest options on serverPluginVue.ts:300
    });

    // TODO use map
    // TODO output errors

    item.template = code.replace("export function render(", "function render(");
  }

  item.script = sfc.descriptor.script?.content ?? "";

  // TODO styles

  return item;
}

export function resolvedTreeToContent(
  item: FileItem,
  processed: Map<string, FileItem>,
  externals: Map<string, FileDependency>,
  externalAsArguments: boolean = false
): string {
  let code = "\n\n// Zipe code begin";

  // add init
  code += "\nlet _ZIPE_APP___\n";

  // external
  for (const [key, val] of externals) {
    console.log("dependency", key, val);

    if (externalAsArguments) {
      // nothing
    } else {
      // TODO remove replace
      // code += `\nimport * as ${key} from '${val.module.replace(
      //   "/@modules/",
      //   ""
      // )}'`;
      code += `\nimport * as ${key} from '${val.module}'`;
    }
  }
  // open block
  code += "\n{";
  // code += `\n${JSON.stringify(
  //   treeDependencyToCode(
  //     {
  //       module: item.relativePath,
  //     } as any,
  //     processed
  //   )
  // )}`;

  const modulesProcessed = new Set<string>();

  const fileDependency = {
    module: item.relativePath,
  } as any;

  for (const module of treeDependencyToCode(fileDependency, processed)) {
    if (modulesProcessed.has(module)) {
      continue;
    }

    const fileItem = processed.get(module)!;

    code += `\n\n// Module ${fileItem.relativePath}`;

    code += `\n${fileItem.content}`;
  }

  // createApp ??
  // code +=`\n _____modules_vue_.createApp(${}).mount(")`

  // expose zipe_app
  code += `\n_ZIPE_APP___ = ${item.varName}`;

  // close block
  code += "\n}";

  // renderApp
  if (externalAsArguments) {
    code += `\n return _ZIPE_APP___`;
  }

  code += "\n\n// Zipe code end";

  return code;
}

// Depth first
export function treeDependencyToCode(
  dep: FileDependency,
  processed: Map<string, FileItem>
) {
  let deps: string[] = [];

  for (const d of processed.get(dep.module)!.dependencies) {
    const x = treeDependencyToCode(d, processed);
    deps.push(...x);
  }

  deps.push(dep.module);
  return deps;
}
