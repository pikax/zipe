import { InternalResolver } from "vite/dist/resolver";
import { ZipeCache } from "../next/cache";
import { cachedRead } from "vite";

export function buildViteCache(resolver: InternalResolver): ZipeCache<string> {
  return {
    get(k) {
      return cachedRead(null, resolver.requestToFile(k)) as any;
    },
    set(k, v) {
      throw new Error("Cannot set on ViteCache");
    },
    async has(k) {
      return !!(await cachedRead(null, resolver.requestToFile(k)));
    },
  };
}
