import { ModuleInformation, ModuleResolver } from "./moduleResolver";
import { ZipeCache } from "./cache";
import { ZipeScriptTransform } from "./transformers";

export type ZipeParser = (
  content: string,
  publicPath: string,
  transformers: Record<string, ZipeScriptTransform | undefined>
) => Promise<{
  code: string;
  map: string | undefined;
  extra: any;
}>;

export function buildParser(
  moduleResolver: ModuleResolver,
  fileCache: ZipeCache
) {
  return {};
}
