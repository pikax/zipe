import { ModuleResolver } from "../next/moduleResolver";
import { InternalResolver } from "vite/dist/resolver";
import { resolveImport } from "../resolveImport";

export function buildViteModuleResolver(
  resolver: InternalResolver,
  root: string
): ModuleResolver {
  return {
    async info(id: string, importer: string) {
      return resolveImport(importer, id, resolver as any);
    },
    alias(id) {
      return (resolver as any).alias(id);
    },
    fileToRequest(publicPath) {
      return resolver.fileToRequest(publicPath);
    },
    requestToFile(publicPath) {
      return resolver.requestToFile(publicPath);
    },
    root,
  };
}
