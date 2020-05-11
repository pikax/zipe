import { InternalResolver } from "vite/dist/resolver";
import { ZipeCache } from "../next/cache";
import { cachedRead } from "vite";

export function buildViteCache(resolver: InternalResolver): ZipeCache<string> {
  return {
    get(k) {
      return cachedRead(null, resolver.requestToFile(k)) as any;
    },
    set(k, v) {
      cachedRead(null, resolver.requestToFile(k));
    },
    async has(k) {
      return !!(await cachedRead(null, resolver.requestToFile(k)));
    },
    delete(k) {
      return;
    },
  };
}
