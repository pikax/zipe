import slash from "slash";
import { posix } from "path";
import { ModuleResolver, ModuleInformation } from "./next";
import fs from "fs-extra";

const bareImportRE = /^[^\/\.]/;
const fileExtensionRE = /\.\w+$/;

export const queryRE = /\?.*$/;
export const hashRE = /\#.*$/;
export const cleanUrl = (url: string) =>
  url.replace(hashRE, "").replace(queryRE, "");

export const webModules = new Set<string>();
export const modules = new Set<string>();
let webModuleFolder: string | false | undefined = undefined;

export const resolveImport = (
  importer: string,
  id: string,
  resolver: ModuleResolver
): ModuleInformation => {
  id = resolver.alias(id) || id;
  if (bareImportRE.test(id)) {
    if (webModuleFolder === undefined) {
      const folder = posix.join(resolver.root, "web_modules");
      webModuleFolder = fs.pathExistsSync(folder) && folder;
    }
    let module = 1;
    let fullPath: string = undefined as any; //TODO FIX ME for node_modules
    if (webModuleFolder) {
      module = webModules.has(id) ? 2 : modules.has(id) ? 1 : -1;

      if (module <= 0) {
        let webId = id;
        if (!id.endsWith(".js")) webId += ".js";
        const p = posix.join(webModuleFolder, webId);
        if (fs.pathExistsSync(p)) {
          webModules.add(id);
          fullPath = p;
          module = 2;
        } else {
          module = 1;
        }
      }
    }

    return {
      fullPath,
      name: id,
      path: `/@modules/${id}`,
      module: module as any,
    };
  } else {
    let pathname = cleanUrl(slash(posix.resolve(posix.dirname(importer), id)));
    // append an extension to extension-less imports
    if (!fileExtensionRE.test(pathname)) {
      const file = resolver.requestToFile(pathname);
      const indexMatch = file.match(/\/index\.\w+$/);
      if (indexMatch) {
        pathname = pathname.replace(/\/(index)?$/, "") + indexMatch[0];
      } else {
        pathname += posix.extname(file);
      }

      return {
        fullPath: file,
        name: id,
        path: pathname,
        module: 0,
      };
    }
    return {
      fullPath: resolver.requestToFile(pathname),
      name: id,
      path: pathname,
      module: 0,
    };
  }
};
