import { InternalResolver } from "vite/dist/resolver";
import { filePathToVar, SFCParseResult, externalToVar } from "../utils";
import path from "path";
import { StyleHeader } from "./processSFC";
import { DependencyImport } from "./replaceImports";
import { resolveSFC } from "./resolveSFC";
import { buildScript } from "./buildScripts";
import { cachedRead } from "vite";
import { transform } from "vite/dist/esbuildService";

const debug = require("debug")("zipe:resolveDependency");

export interface DependencyPointer extends DependencyImport {
  // id: number;
  varName: string;
}

export interface ZipeDependency {
  // id: number;

  // global variable name
  varName: string;

  // relative path to root aka publicPath
  relativePath: string;

  // filename
  name: string;

  filePath: string;

  content: string;

  // includes children styles
  styles: StyleHeader[];

  dependencies: DependencyPointer[];
  modules: DependencyPointer[];

  internal: {
    sfc?: SFCParseResult;
    content?: string;

    source: string;
  };
}

export async function resolveZipeDependency(
  filePath: string,
  resolver: InternalResolver,
  processed: Map<string, ZipeDependency>,
  external: Map<string, DependencyPointer>,
  root: string
): Promise<ZipeDependency> {
  const relativePath = resolver.fileToRequest(filePath);
  // console.log("re", { relativePath, filePath });

  const varName = filePathToVar(relativePath);
  const name = path.basename(filePath);

  if (processed.has(relativePath)) {
    console.log("[skipping] processed file");
    const p = processed.get(relativePath)!;
    p.modules.forEach((x) => external.set(x.varName, x));
    if (p.dependencies) {
      const promises = p.dependencies.map((x) =>
        resolveZipeDependency(
          resolver.requestToFile(x.module),
          resolver,
          processed,
          external,
          root
        )
      );
      await Promise.all(promises);
    }
    return p;
  }

  const item: ZipeDependency = {
    varName,

    // filename
    name,
    relativePath,

    filePath,

    content: null,

    dependencies: [],
    modules: [],

    styles: [],

    internal: {
      sfc: undefined,
      content: undefined,

      source: undefined,
    },
  } as any;
  processed.set(relativePath, item);

  const replacer = (importLine: string, r: DependencyImport): string => {
    // TODO check if this is actually correct
    const isExternal =
      r.module.startsWith("/@modules") || resolver.idToRequest(r.module)
        ? true
        : false;

    const varName = isExternal
      ? externalToVar(r.module)
      : filePathToVar(r.module);

    debug("[replacing] dependency", r.module, "to", varName);

    const dep = {
      varName,
      ...r,
    };
    if (isExternal) {
      item.modules.push(dep);
      external.set(varName, dep);
    } else {
      item.dependencies.push(dep);
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

  const rawContent = await cachedRead(null, item.filePath);

  const ext = path.extname(filePath);
  // console.log("filepath", filePath);
  if (ext.endsWith(".vue")) {
    const { content, styles } = await resolveSFC(
      item,
      rawContent,
      root,
      replacer,
      resolver
    );
    item.content = content;
    item.styles = styles;
    // console.log("item.contentSFC", item.content.length);

    // console.log("item.contentSFC", item.content);
  } else if (ext === ".js") {
    item.content = buildScript(item, rawContent);
  } else if (ext === ".ts") {
    const js = await transform(rawContent, item.relativePath, { loader: "ts" });
    item.content = buildScript(item, js.code);
  } else {
    // item.content = `import (${relativePath})`;
    console.warn("[warn] not supported file type", path.extname(filePath));
  }
  //  if (filePath.endsWith("html")) {
  //   // TODO
  // }

  // TODO dependencies

  const promises = [];
  for (const dependency of item.dependencies) {
    promises.push(
      resolveZipeDependency(
        resolver.requestToFile(dependency.module),
        resolver,
        processed,
        external,
        root
      ).then((x) => {
        item.styles.push(...x.styles);
      })
    );
  }

  await Promise.all(promises);

  return item;
}
