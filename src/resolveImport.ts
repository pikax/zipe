import slash from "slash";
import { posix } from "path";
import { ModuleResolver, ModuleInformation } from "./next";
const bareImportRE = /^[^\/\.]/;
const fileExtensionRE = /\.\w+$/;

export const queryRE = /\?.*$/;
export const hashRE = /\#.*$/;
export const cleanUrl = (url: string) =>
  url.replace(hashRE, "").replace(queryRE, "");

export const resolveImport = (
  importer: string,
  id: string,
  resolver: ModuleResolver
): ModuleInformation => {
  id = resolver.alias(id) || id;
  if (bareImportRE.test(id)) {
    return {
      fullPath: undefined as any, //TODO FIX ME
      name: id,
      path: `/@modules/${id}`,
      module: true,
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
        module: false,
      };
    }
    return {
      fullPath: resolver.requestToFile(pathname),
      name: id,
      path: pathname,
      module: false,
    };
  }
};
